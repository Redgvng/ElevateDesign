import { createHash } from "node:crypto";
import {
  DesignSpecSchema,
  type Artifact,
  type DesignSpec,
  type DeviceType,
  type GenerationJob,
  type ScreenVersion,
} from "@odc/shared";
import { designSpecToHtml } from "../compiler/designSpecToHtml";
import { buildScreenPlan } from "../modules/selectModules";
import type { AiProvider } from "../providers/AiProvider";
import { renderHtmlScreenshot, type RenderHtmlScreenshotOutput } from "../render/renderHtmlScreenshot";
import type { ArtifactObjectStore } from "../storage/objectStore";

/** Annotates a DesignSpec with the traceable module ids selected for the prompt. */
function annotateModuleRefs(
  designSpec: DesignSpec,
  prompt: string,
  deviceType: DeviceType,
): DesignSpec {
  const plan = buildScreenPlan({ prompt, deviceType });
  if (plan.modules.length === 0) return designSpec;
  return { ...designSpec, moduleRefs: plan.modules.map((module) => module.moduleId) };
}

export type GenerationResultPersister = {
  persistCompletedGeneration(input: CompletedGenerationResult): Promise<{
    job: GenerationJob;
    screenVersion: ScreenVersion;
    artifacts?: Artifact[];
  }>;
  persistCompletedVariants?(input: CompletedVariantsResult): Promise<{
    job: GenerationJob;
    screenVersions: ScreenVersion[];
    artifacts?: Artifact[];
  }>;
};

export type CompletedVariantsResult = {
  jobId: string;
  projectId: string;
  screenId: string;
  prompt: string;
  provider: string;
  model: string;
  baseVersionId: string | null;
  variants: Array<{
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
  edit?: {
    screenId: string;
    baseVersionId: string | null;
  };
};

type RenderedScreenshotArtifact = NonNullable<CompletedGenerationResult["screenshot"]> & {
  bytes: Buffer;
};

export type ScreenContextReader = {
  findScreen(screenId: string): Promise<{ id: string; projectId: string; currentVersionId: string } | null>;
  findScreenVersion(screenVersionId: string): Promise<{ id: string; designSpec: DesignSpec } | null>;
};

export type GenerationJobProcessorOptions = {
  provider: AiProvider;
  persister: GenerationResultPersister;
  artifactStore: Pick<ArtifactObjectStore, "putObject" | "deleteObject">;
  screenReader?: ScreenContextReader;
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
  screenReader,
  renderScreenshot = renderHtmlScreenshot,
  providerName = "mock",
  model = "mock-v1",
}: GenerationJobProcessorOptions): GenerationJobProcessor {
  return {
    async process(job) {
      if (job.type === "generate_variants") {
        return processVariants(job, {
          provider,
          persister,
          artifactStore,
          screenReader,
          renderScreenshot,
          providerName,
          model,
        });
      }

      if (job.type !== "generate_screen" && job.type !== "edit_screen") {
        throw new GenerationProcessingError(
          "VALIDATION_ERROR",
          `Unsupported generation job type: ${job.type}`,
        );
      }

      const editContext =
        job.type === "edit_screen" ? await resolveEditContext(job, screenReader) : null;

      const output = await provider.generateStructuredDesign({
        type: job.type,
        projectId: job.projectId,
        prompt: job.prompt,
        deviceType: job.deviceType,
        mode: job.mode,
        screenId: editContext?.screenId,
        baseDesignSpec: editContext?.baseDesignSpec,
        designContext: job.designContext,
      });
      const parsed = DesignSpecSchema.safeParse(output.designSpec);

      if (!parsed.success) {
        throw new GenerationProcessingError(
          "VALIDATION_ERROR",
          "Generated DesignSpec failed validation",
          parsed.error.issues,
        );
      }

      const designSpec = annotateModuleRefs(parsed.data, job.prompt, job.deviceType);
      const htmlCode = designSpecToHtml(designSpec);
      const screenshot = await renderScreenshotForJob(job, designSpec, htmlCode, renderScreenshot);

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
          designSpec,
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
          edit: editContext
            ? { screenId: editContext.screenId, baseVersionId: editContext.baseVersionId }
            : undefined,
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

type EditContext = {
  screenId: string;
  baseVersionId: string;
  baseDesignSpec: DesignSpec;
};

async function resolveEditContext(
  job: GenerationJob,
  screenReader: ScreenContextReader | undefined,
): Promise<EditContext> {
  if (!screenReader) {
    throw new GenerationProcessingError(
      "CONFIGURATION_ERROR",
      "edit_screen jobs require a screen reader",
    );
  }
  if (!job.targetScreenId) {
    throw new GenerationProcessingError(
      "VALIDATION_ERROR",
      "edit_screen job is missing a target screenId",
    );
  }

  const screen = await screenReader.findScreen(job.targetScreenId);
  if (!screen) {
    throw new GenerationProcessingError(
      "NOT_FOUND",
      `Screen ${job.targetScreenId} not found for edit job ${job.id}`,
    );
  }
  if (screen.projectId !== job.projectId) {
    throw new GenerationProcessingError(
      "VALIDATION_ERROR",
      `Screen ${job.targetScreenId} does not belong to project ${job.projectId}`,
    );
  }

  const baseVersion = await screenReader.findScreenVersion(screen.currentVersionId);
  if (!baseVersion) {
    throw new GenerationProcessingError(
      "NOT_FOUND",
      `Base version ${screen.currentVersionId} not found for screen ${screen.id}`,
    );
  }

  return {
    screenId: screen.id,
    baseVersionId: baseVersion.id,
    baseDesignSpec: baseVersion.designSpec,
  };
}

async function renderScreenshotForJob(
  job: GenerationJob,
  designSpec: DesignSpec,
  htmlCode: string,
  renderScreenshot: typeof renderHtmlScreenshot,
  keySuffix?: string,
): Promise<RenderedScreenshotArtifact> {
  const screenshot = await renderScreenshot({
    html: htmlCode,
    viewport: {
      width: Math.min(designSpec.viewport.width, 1440),
      height: Math.min(designSpec.viewport.height, 1024),
    },
  });

  return screenshotToArtifactInput(job.id, screenshot, keySuffix);
}

function screenshotToArtifactInput(
  jobId: string,
  screenshot: RenderHtmlScreenshotOutput,
  keySuffix?: string,
): RenderedScreenshotArtifact {
  const path = keySuffix ? `${keySuffix}/screenshot.png` : "screenshot.png";
  return {
    bytes: screenshot.bytes,
    storageKey: `generation-jobs/${jobId}/${path}`,
    checksum: `sha256:${createHash("sha256").update(screenshot.bytes).digest("hex")}`,
    mimeType: screenshot.mimeType,
    byteSize: screenshot.bytes.byteLength,
    width: screenshot.width,
    height: screenshot.height,
  };
}

async function processVariants(
  job: GenerationJob,
  deps: Required<Pick<GenerationJobProcessorOptions, "provider" | "persister" | "artifactStore">> &
    Pick<GenerationJobProcessorOptions, "screenReader"> & {
      renderScreenshot: typeof renderHtmlScreenshot;
      providerName: string;
      model: string;
    },
): Promise<{ job: GenerationJob; screenVersion: ScreenVersion; artifacts?: Artifact[] }> {
  const persistVariants = deps.persister.persistCompletedVariants;
  if (!persistVariants) {
    throw new GenerationProcessingError(
      "CONFIGURATION_ERROR",
      "generate_variants jobs require a variants persister",
    );
  }

  const editContext = await resolveEditContext(job, deps.screenReader);
  const count = clampVariantCount(job.variantCount);

  const variants: CompletedVariantsResult["variants"] = [];
  const uploadedKeys: string[] = [];

  try {
    for (let index = 0; index < count; index += 1) {
      const output = await deps.provider.generateStructuredDesign({
        type: "generate_variants",
        projectId: job.projectId,
        prompt: job.prompt,
        deviceType: job.deviceType,
        mode: job.mode,
        screenId: editContext.screenId,
        baseDesignSpec: editContext.baseDesignSpec,
        variantIndex: index,
        designContext: job.designContext,
      });
      const parsed = DesignSpecSchema.safeParse(output.designSpec);
      if (!parsed.success) {
        throw new GenerationProcessingError(
          "VALIDATION_ERROR",
          "Generated DesignSpec failed validation",
          parsed.error.issues,
        );
      }

      const designSpec = annotateModuleRefs(parsed.data, job.prompt, job.deviceType);
      const htmlCode = designSpecToHtml(designSpec);
      const screenshot = await renderScreenshotForJob(
        job,
        designSpec,
        htmlCode,
        deps.renderScreenshot,
        `variant-${index}`,
      );

      await deps.artifactStore.putObject({
        key: screenshot.storageKey,
        bytes: screenshot.bytes,
        contentType: screenshot.mimeType,
      });
      uploadedKeys.push(screenshot.storageKey);

      variants.push({
        designSpec,
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
    }
  } catch (error) {
    await cleanupUploaded(deps.artifactStore, uploadedKeys);
    if (error instanceof GenerationProcessingError) throw error;
    throw new GenerationProcessingError(
      "ARTIFACT_STORAGE_ERROR",
      "Failed to render or upload a generated variant",
      serializeError(error),
      true,
    );
  }

  try {
    const result = await persistVariants({
      jobId: job.id,
      projectId: job.projectId,
      screenId: editContext.screenId,
      prompt: job.prompt,
      provider: deps.providerName,
      model: deps.model,
      baseVersionId: editContext.baseVersionId,
      variants,
    });
    return { job: result.job, screenVersion: result.screenVersions[0], artifacts: result.artifacts };
  } catch (error) {
    await cleanupUploaded(deps.artifactStore, uploadedKeys);
    throw new GenerationProcessingError(
      "PERSISTENCE_ERROR",
      "Failed to persist generated variants",
      serializeError(error),
      true,
    );
  }
}

function clampVariantCount(count: number | null | undefined): number {
  if (typeof count !== "number" || Number.isNaN(count)) return 3;
  return Math.max(2, Math.min(4, Math.floor(count)));
}

async function cleanupUploaded(
  artifactStore: Pick<ArtifactObjectStore, "deleteObject">,
  keys: string[],
): Promise<void> {
  await Promise.all(
    keys.map((key) => artifactStore.deleteObject(key).catch(() => undefined)),
  );
}

function serializeError(error: unknown): { name?: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }

  return { message: String(error) };
}
