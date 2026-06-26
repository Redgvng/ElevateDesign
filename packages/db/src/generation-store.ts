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

export type CreateQueuedOptions = {
  designContext?: string | null;
};

export type GenerationJobRepository = {
  createQueued(
    projectId: string,
    input: CreateGenerationJobInput,
    options?: CreateQueuedOptions,
  ): Promise<GenerationJob>;
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

export type VariantArtifactInput = {
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
};

export type AuthoredScreenVersionInput = {
  projectId: string;
  designSpec: DesignSpec;
  htmlCode: string;
  reactCode: string | null;
  sourcePrompt: string;
  provider: string;
  model: string;
  baseScreenId?: string | null;
  baseVersionId?: string | null;
};

export type CompletedVariantsInput = {
  jobId: string;
  projectId: string;
  screenId: string;
  prompt: string;
  provider: string;
  model: string;
  baseVersionId: string | null;
  variants: VariantArtifactInput[];
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

    async persistCompletedVariants(input: CompletedVariantsInput): Promise<{
      job: GenerationJob;
      screen: Screen;
      screenVersions: ScreenVersion[];
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
          const loaded = await loadCompletedGeneration(repositories, existingJob);
          return {
            job: loaded.job,
            screen: loaded.screen,
            screenVersions: [loaded.screenVersion],
            artifacts: loaded.artifacts,
          };
        }
        if (existingJob.status !== "running") {
          throw new Error(
            `Generation job ${input.jobId} cannot complete from status ${existingJob.status}`,
          );
        }
        if (input.variants.length === 0) {
          throw new Error(`Variants job ${input.jobId} has no variants to persist`);
        }

        const baseScreen = await repositories.screens.findById(input.screenId);
        if (!baseScreen) {
          throw new Error(`Screen ${input.screenId} not found for variants job ${input.jobId}`);
        }
        if (baseScreen.projectId !== input.projectId) {
          throw new Error(`Screen ${input.screenId} does not belong to project ${input.projectId}`);
        }

        const existingVersions = await repositories.screenVersions.listByScreen(baseScreen.id);
        let nextVersionNumber =
          existingVersions.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1;
        const parentVersionId = input.baseVersionId ?? baseScreen.currentVersionId;

        const screenVersions: ScreenVersion[] = [];
        const artifacts: Artifact[] = [];

        for (const variant of input.variants) {
          const screenVersionId = `ver_${randomUUID()}`;
          const screenshotArtifactId = variant.screenshot ? `artifact_${randomUUID()}` : null;

          const screenVersion = await repositories.screenVersions.create({
            id: screenVersionId,
            screenId: baseScreen.id,
            versionNumber: nextVersionNumber,
            sourcePrompt: input.prompt,
            operation: "variant",
            designSpec: variant.designSpec,
            htmlCode: variant.htmlCode,
            reactCode: variant.reactCode,
            screenshotArtifactId,
            parentVersionId,
            provider: input.provider,
            model: input.model,
          });
          screenVersions.push(screenVersion);
          nextVersionNumber += 1;

          if (variant.screenshot) {
            artifacts.push(
              await repositories.artifacts.create({
                id: screenshotArtifactId ?? undefined,
                projectId: input.projectId,
                screenVersionId: screenVersion.id,
                type: "screenshot",
                storageKey: variant.screenshot.storageKey,
                checksum: variant.screenshot.checksum,
                mimeType: variant.screenshot.mimeType,
                byteSize: variant.screenshot.byteSize,
                width: variant.screenshot.width,
                height: variant.screenshot.height,
                metadata: {},
              }),
            );
          }
        }

        const primaryVersion = screenVersions[0];
        const screen = await repositories.screens.setCurrentVersion(baseScreen.id, primaryVersion.id);
        const job = await repositories.generationJobs.complete(input.jobId, {
          screenId: screen.id,
          screenVersionId: primaryVersion.id,
        });

        return { job, screen, screenVersions, artifacts };
      });
    },

    async persistAuthoredScreenVersion(input: AuthoredScreenVersionInput): Promise<{
      screen: Screen;
      screenVersion: ScreenVersion;
    }> {
      return unitOfWork.transaction(async (repositories) => {
        const screenVersionId = `ver_${randomUUID()}`;

        let screen: Screen;
        let versionNumber = 1;
        let operation: ScreenVersion["operation"] = "generate";
        let parentVersionId: string | null = null;

        if (input.baseScreenId) {
          const baseScreen = await repositories.screens.findById(input.baseScreenId);
          if (!baseScreen) {
            throw new Error(`Screen ${input.baseScreenId} not found`);
          }
          if (baseScreen.projectId !== input.projectId) {
            throw new Error(`Screen ${input.baseScreenId} does not belong to project ${input.projectId}`);
          }

          const existingVersions = await repositories.screenVersions.listByScreen(baseScreen.id);
          versionNumber =
            existingVersions.reduce((max, version) => Math.max(max, version.versionNumber), 0) + 1;
          operation = "edit";
          parentVersionId = input.baseVersionId ?? baseScreen.currentVersionId;
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
          sourcePrompt: input.sourcePrompt,
          operation,
          designSpec: input.designSpec,
          htmlCode: input.htmlCode,
          reactCode: input.reactCode,
          screenshotArtifactId: null,
          parentVersionId,
          provider: input.provider,
          model: input.model,
        });

        return { screen, screenVersion };
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
