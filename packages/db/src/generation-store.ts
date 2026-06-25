import { randomUUID } from "node:crypto";
import type {
  Artifact,
  CreateGenerationJobInput,
  DesignSpec,
  DeviceType,
  GenerationJob,
  Screen,
  ScreenVersion,
  ScreenVersionSummary,
} from "@odc/shared";

export type StoredGeneration = {
  job: GenerationJob;
  screenVersion?: ScreenVersion;
  artifacts?: Artifact[];
};

export type GenerationJobFailure = {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
};

export type GenerationJobRepository = {
  createQueued(projectId: string, input: CreateGenerationJobInput): Promise<GenerationJob>;
  findById(jobId: string): Promise<GenerationJob | null>;
  findByIdForUpdate(jobId: string): Promise<GenerationJob | null>;
  listQueued(limit: number): Promise<GenerationJob[]>;
  acquireQueued(jobId: string, leaseDurationMs: number): Promise<GenerationJob | null>;
  renewLease(jobId: string, leaseDurationMs: number): Promise<boolean>;
  requeueExpiredRunning(now: Date, limit: number): Promise<GenerationJob[]>;
  cancel(jobId: string): Promise<GenerationJob | null>;
  releaseForRetry(jobId: string, error: GenerationJobFailure): Promise<GenerationJob>;
  complete(
    jobId: string,
    result: { screenId: string; screenVersionId: string },
  ): Promise<GenerationJob>;
  fail(jobId: string, error: GenerationJobFailure): Promise<GenerationJob>;
};

export type ScreenCreateInput = {
  projectId: string;
  title: string;
  deviceType: DeviceType;
  currentVersionId: string | null;
};

export type ScreenRepository = {
  create(input: ScreenCreateInput): Promise<Screen>;
  findById(screenId: string): Promise<Screen | null>;
  listByProject(projectId: string): Promise<Screen[]>;
  setCurrentVersion(screenId: string, screenVersionId: string): Promise<Screen>;
};

export type ScreenVersionCreateInput = {
  id?: string;
  screenId: string;
  versionNumber: number;
  sourcePrompt: string;
  operation: ScreenVersion["operation"];
  designSpec: DesignSpec;
  htmlCode: string;
  reactCode: string | null;
  screenshotArtifactId: string | null;
  parentVersionId: string | null;
  provider: string;
  model: string;
};

export type ScreenVersionRepository = {
  create(input: ScreenVersionCreateInput): Promise<ScreenVersion>;
  findById(screenVersionId: string): Promise<ScreenVersion | null>;
  listByScreen(screenId: string): Promise<ScreenVersionSummary[]>;
};

export type ArtifactCreateInput = {
  id?: string;
  projectId: string;
  screenVersionId: string | null;
  type: Artifact["type"];
  storageKey: string;
  checksum: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  metadata: Record<string, unknown>;
};

export type ArtifactRepository = {
  create(input: ArtifactCreateInput): Promise<Artifact>;
  findById(artifactId: string): Promise<Artifact | null>;
  listByScreenVersion(screenVersionId: string): Promise<Artifact[]>;
};

export type GenerationRepositories = {
  generationJobs: GenerationJobRepository;
  screens: ScreenRepository;
  screenVersions: ScreenVersionRepository;
  artifacts: ArtifactRepository;
};

export type GenerationUnitOfWork = {
  transaction<T>(callback: (repositories: GenerationRepositories) => Promise<T>): Promise<T>;
};

export type CompletedGenerationInput = {
  jobId: string;
  projectId: string;
  prompt: string;
  deviceType: DeviceType;
  provider: string;
  model: string;
  designSpec: DesignSpec;
  htmlCode: string;
  reactCode: string | null;
  screenshot: {
    storageKey: string;
    checksum: string;
    mimeType: string;
    byteSize: number;
    width: number | null;
    height: number | null;
  } | null;
  edit?: {
    screenId: string;
    baseVersionId: string | null;
  };
};

export function createGenerationResultPersister(unitOfWork: GenerationUnitOfWork) {
  return {
    async persistCompletedGeneration(input: CompletedGenerationInput): Promise<{
      job: GenerationJob;
      screen: Screen;
      screenVersion: ScreenVersion;
      artifacts: Artifact[];
    }> {
      return unitOfWork.transaction(async (repositories) => {
        const existingJob = await repositories.generationJobs.findByIdForUpdate(input.jobId);
        if (!existingJob) {
          throw new Error(`Generation job ${input.jobId} not found`);
        }
        if (existingJob.projectId !== input.projectId) {
          throw new Error(`Generation job ${input.jobId} does not belong to project ${input.projectId}`);
        }
        if (existingJob.status === "completed") {
          return loadCompletedGeneration(repositories, existingJob);
        }
        if (existingJob.status !== "running") {
          throw new Error(
            `Generation job ${input.jobId} cannot complete from status ${existingJob.status}`,
          );
        }

        const screenVersionId = `ver_${randomUUID()}`;
        const screenshotArtifactId = input.screenshot ? `artifact_${randomUUID()}` : null;

        let screen: Screen;
        let versionNumber = 1;
        let operation: ScreenVersion["operation"] = "generate";
        let parentVersionId: string | null = null;

        if (input.edit) {
          const baseScreen = await repositories.screens.findById(input.edit.screenId);
          if (!baseScreen) {
            throw new Error(`Screen ${input.edit.screenId} not found for edit job ${input.jobId}`);
          }
          if (baseScreen.projectId !== input.projectId) {
            throw new Error(`Screen ${input.edit.screenId} does not belong to project ${input.projectId}`);
          }

          const existingVersions = await repositories.screenVersions.listByScreen(baseScreen.id);
          versionNumber =
            existingVersions.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1;
          operation = "edit";
          parentVersionId = input.edit.baseVersionId ?? baseScreen.currentVersionId;
          screen = await repositories.screens.setCurrentVersion(baseScreen.id, screenVersionId);
        } else {
          screen = await repositories.screens.create({
            projectId: input.projectId,
            title: input.designSpec.title,
            deviceType: input.designSpec.deviceType,
            currentVersionId: screenVersionId,
          });
        }

        const screenVersion = await repositories.screenVersions.create({
          id: screenVersionId,
          screenId: screen.id,
          versionNumber,
          sourcePrompt: input.prompt,
          operation,
          designSpec: input.designSpec,
          htmlCode: input.htmlCode,
          reactCode: input.reactCode,
          screenshotArtifactId,
          parentVersionId,
          provider: input.provider,
          model: input.model,
        });
        const artifacts: Artifact[] = [];

        if (input.screenshot) {
          artifacts.push(
            await repositories.artifacts.create({
              id: screenshotArtifactId ?? undefined,
              projectId: input.projectId,
              screenVersionId: screenVersion.id,
              type: "screenshot",
              storageKey: input.screenshot.storageKey,
              checksum: input.screenshot.checksum,
              mimeType: input.screenshot.mimeType,
              byteSize: input.screenshot.byteSize,
              width: input.screenshot.width,
              height: input.screenshot.height,
              metadata: {},
            }),
          );
        }

        const job = await repositories.generationJobs.complete(input.jobId, {
          screenId: screen.id,
          screenVersionId: screenVersion.id,
        });

        return { job, screen, screenVersion, artifacts };
      });
    },
  };
}

async function loadCompletedGeneration(
  repositories: GenerationRepositories,
  job: GenerationJob,
): Promise<{
  job: GenerationJob;
  screen: Screen;
  screenVersion: ScreenVersion;
  artifacts: Artifact[];
}> {
  if (!job.result) {
    throw new Error(`Completed generation job ${job.id} has no result`);
  }

  const [screen, screenVersion, artifacts] = await Promise.all([
    repositories.screens.findById(job.result.screenId),
    repositories.screenVersions.findById(job.result.screenVersionId),
    repositories.artifacts.listByScreenVersion(job.result.screenVersionId),
  ]);

  if (!screen || !screenVersion) {
    throw new Error(`Completed generation job ${job.id} references missing persisted output`);
  }

  return { job, screen, screenVersion, artifacts };
}
