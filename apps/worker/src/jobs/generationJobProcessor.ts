import { createHash } from "node:crypto";
import {
  DesignSpecSchema,
  type Artifact,
  type DesignSpec,
  type GenerationJob,
  type ScreenVersion,
} from "@odc/shared";
import { designSpecToHtml } from "../compiler/designSpecToHtml";
import type { AiProvider } from "../providers/AiProvider";
import { renderHtmlScreenshot, type RenderHtmlScreenshotOutput } from "../render/renderHtmlScreenshot";
import type { ArtifactObjectStore } from "../storage/objectStore";

export type GenerationResultPersister = {
  persistCompletedGeneration(input: CompletedGenerationResult): Promise<{
    job: GenerationJob;
    screenVersion: ScreenVersion;
    artifacts?: Artifact[];
  }>;
};

export type CompletedGenerationResult = {
  jobId: string;
  projectId: string;
  prompt: string;
  deviceType: GenerationJob["deviceType"];
  provider: string;
  model: string;
  designSpec: DesignSpec;
  htmlCode: string;
  reactCode: string | null;
  screenshot: {
    storageKey: string;
    checksum: string;
    mimeType: "image/png";
    byteSize: number;
    width: number;
    height: number;
  } | null;
};

type RenderedScreenshotArtifact = NonNullable<CompletedGenerationResult["screenshot"]> & {
  bytes: Buffer;
};

export type GenerationJobProcessorOptions = {
  provider: AiProvider;
  persister: GenerationResultPersister;
  artifactStore: Pick<ArtifactObjectStore, "putObject" | "deleteObject">;
  renderScreenshot?: typeof renderHtmlScreenshot;
  providerName?: string;
  model?: string;
};

export type GenerationJobProcessor = {
  process(job: GenerationJob): Promise<{
    job: GenerationJob;
    screenVersion: ScreenVersion;
    artifacts?: Artifact[];
  }>;
};

export class GenerationProcessingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "GenerationProcessingError";
  }
}

export function createGenerationJobProcessor({
  provider,
  persister,
  artifactStore,
  renderScreenshot = renderHtmlScreenshot,
  providerName = "mock",
  model = "mock-v1",
}: GenerationJobProcessorOptions): GenerationJobProcessor {
  return {
    async process(job) {
      if (job.type !== "generate_screen") {
        throw new GenerationProcessingError(
          "VALIDATION_ERROR",
          `Unsupported generation job type: ${job.type}`,
        );
      }

      const output = await provider.generateStructuredDesign({
        type: "generate_screen",
        projectId: job.projectId,
        prompt: job.prompt,
        deviceType: job.deviceType,
        mode: job.mode,
      });
      const parsed = DesignSpecSchema.safeParse(output.designSpec);

      if (!parsed.success) {
        throw new GenerationProcessingError(
          "VALIDATION_ERROR",
          "Generated DesignSpec failed validation",
          parsed.error.issues,
        );
      }

      const htmlCode = designSpecToHtml(parsed.data);
      const screenshot = await renderScreenshotForJob(job, parsed.data, htmlCode, renderScreenshot);

      try {
        await artifactStore.putObject({
          key: screenshot.storageKey,
          bytes: screenshot.bytes,
          contentType: screenshot.mimeType,
        });
      } catch (error) {
        throw new GenerationProcessingError(
          "ARTIFACT_STORAGE_ERROR",
          "Failed to upload generated screenshot",
          serializeError(error),
          true,
        );
      }

      try {
        return await persister.persistCompletedGeneration({
          jobId: job.id,
          projectId: job.projectId,
          prompt: job.prompt,
          deviceType: job.deviceType,
          provider: providerName,
          model,
          designSpec: parsed.data,
          htmlCode,
          reactCode: null,
          screenshot: {
            storageKey: screenshot.storageKey,
            checksum: screenshot.checksum,
            mimeType: screenshot.mimeType,
            byteSize: screenshot.byteSize,
            width: screenshot.width,
            height: screenshot.height,
          },
        });
      } catch (error) {
        try {
          await artifactStore.deleteObject(screenshot.storageKey);
        } catch (cleanupError) {
          throw new GenerationProcessingError(
            "PERSISTENCE_AND_CLEANUP_ERROR",
            "Failed to persist generation result and remove its uploaded screenshot",
            {
              persistenceError: serializeError(error),
              cleanupError: serializeError(cleanupError),
              storageKey: screenshot.storageKey,
            },
            true,
          );
        }

        throw new GenerationProcessingError(
          "PERSISTENCE_ERROR",
          "Failed to persist generation result",
          serializeError(error),
          true,
        );
      }
    },
  };
}

async function renderScreenshotForJob(
  job: GenerationJob,
  designSpec: DesignSpec,
  htmlCode: string,
  renderScreenshot: typeof renderHtmlScreenshot,
): Promise<RenderedScreenshotArtifact> {
  const screenshot = await renderScreenshot({
    html: htmlCode,
    viewport: {
      width: Math.min(designSpec.viewport.width, 1440),
      height: Math.min(designSpec.viewport.height, 1024),
    },
  });

  return screenshotToArtifactInput(job.id, screenshot);
}

function screenshotToArtifactInput(
  jobId: string,
  screenshot: RenderHtmlScreenshotOutput,
): RenderedScreenshotArtifact {
  return {
    bytes: screenshot.bytes,
    storageKey: `generation-jobs/${jobId}/screenshot.png`,
    checksum: `sha256:${createHash("sha256").update(screenshot.bytes).digest("hex")}`,
    mimeType: screenshot.mimeType,
    byteSize: screenshot.bytes.byteLength,
    width: screenshot.width,
    height: screenshot.height,
  };
}

function serializeError(error: unknown): { name?: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }

  return { message: String(error) };
}
