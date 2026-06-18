import { randomUUID } from "node:crypto";
import { DesignSpecSchema, type CreateGenerationJobInput, type GenerationJob, type ScreenVersion } from "@odc/shared";
import { MockAiProvider, designSpecToHtml, renderHtmlScreenshot } from "@odc/worker";
import type { ProjectStore } from "./project-store";

type StoredGeneration = {
  job: GenerationJob;
  screenVersion?: ScreenVersion;
};

export type GenerationStore = {
  createJob(projectId: string, input: CreateGenerationJobInput): Promise<StoredGeneration>;
  getJob(jobId: string): Promise<StoredGeneration | null>;
};

export type ScreenshotRenderer = typeof renderHtmlScreenshot;

export type InMemoryGenerationStoreOptions = {
  renderScreenshot?: ScreenshotRenderer;
};

export function createInMemoryGenerationStore(
  projectStore: ProjectStore,
  options: InMemoryGenerationStoreOptions = {},
): GenerationStore {
  const jobs = new Map<string, StoredGeneration>();
  const provider = new MockAiProvider();
  const renderScreenshot = options.renderScreenshot ?? renderHtmlScreenshot;

  return {
    async createJob(projectId, input) {
      const project = await projectStore.getProject(projectId);
      if (!project) throw new GenerationProjectNotFoundError();

      const now = new Date().toISOString();
      const job: GenerationJob = {
        id: `job_${randomUUID()}`,
        projectId,
        type: "generate_screen",
        status: "running",
        prompt: input.prompt,
        deviceType: input.deviceType,
        mode: input.mode,
        result: null,
        error: null,
        createdAt: now,
        updatedAt: now,
      };
      jobs.set(job.id, { job });

      try {
        const output = await provider.generateStructuredDesign({ ...input, projectId });
        const parsed = DesignSpecSchema.safeParse(output.designSpec);
        if (!parsed.success) {
          job.status = "failed";
          job.error = {
            code: "VALIDATION_ERROR",
            message: "Generated DesignSpec failed validation",
            details: parsed.error.issues,
          };
          job.updatedAt = new Date().toISOString();
          return { job };
        }

        const screenId = `screen_${randomUUID()}`;
        const screenVersionId = `ver_${randomUUID()}`;
        const htmlCode = designSpecToHtml(parsed.data);
        const screenshotArtifactId = await createScreenshotArtifactId(
          {
            htmlCode,
            width: parsed.data.viewport.width,
            height: parsed.data.viewport.height,
          },
          renderScreenshot,
        );
        const screenVersion: ScreenVersion = {
          id: screenVersionId,
          screenId,
          versionNumber: 1,
          sourcePrompt: input.prompt,
          operation: "generate",
          designSpec: parsed.data,
          htmlCode,
          reactCode: null,
          screenshotArtifactId,
          parentVersionId: null,
          createdAt: new Date().toISOString(),
        };

        job.status = "completed";
        job.result = { screenId, screenVersionId };
        job.updatedAt = new Date().toISOString();
        const stored = { job, screenVersion };
        jobs.set(job.id, stored);
        return stored;
      } catch (error) {
        job.status = "failed";
        job.error = {
          code: "AI_PROVIDER_ERROR",
          message: error instanceof Error ? error.message : "Generation failed",
        };
        job.updatedAt = new Date().toISOString();
        return { job };
      }
    },

    async getJob(jobId) {
      return jobs.get(jobId) ?? null;
    },
  };
}

export class GenerationProjectNotFoundError extends Error {
  constructor() {
    super("Project not found");
    this.name = "GenerationProjectNotFoundError";
  }
}

async function createScreenshotArtifactId(
  input: {
    htmlCode: string;
    width: number;
    height: number;
  },
  renderScreenshot: ScreenshotRenderer,
): Promise<string | null> {
  try {
    const screenshot = await renderScreenshot({
      html: input.htmlCode,
      viewport: {
        width: Math.min(input.width, 1440),
        height: Math.min(input.height, 1024),
      },
    });

    return screenshot.bytes.byteLength > 0 ? `artifact_${randomUUID()}` : null;
  } catch {
    return null;
  }
}
