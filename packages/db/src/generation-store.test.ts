import { describe, expect, it } from "vitest";
import type { Artifact, DesignSpec, GenerationJob, Screen, ScreenVersion } from "@odc/shared";
import {
  createGenerationResultPersister,
  type GenerationRepositories,
  type GenerationUnitOfWork,
} from "./generation-store";

describe("createGenerationResultPersister", () => {
  it("returns the persisted result without duplicating entities when completion is replayed", async () => {
    const state = createRepositoryState();
    const persister = createGenerationResultPersister(state.unitOfWork);

    const first = await persister.persistCompletedGeneration(completedInput);
    const second = await persister.persistCompletedGeneration(completedInput);

    expect(second).toEqual(first);
    expect(state.createCounts).toEqual({ screens: 1, versions: 1, artifacts: 1 });
    expect(state.job.status).toBe("completed");
    expect(state.job.result).toEqual({
      screenId: first.screen.id,
      screenVersionId: first.screenVersion.id,
    });
  });

  it("persists an agent-authored spec as a new screen version (no job)", async () => {
    const state = createRepositoryState();
    const persister = createGenerationResultPersister(state.unitOfWork);

    const { screen, screenVersion } = await persister.persistAuthoredScreenVersion({
      projectId: "proj_1",
      designSpec: completedInput.designSpec,
      htmlCode: "<html></html>",
      reactCode: null,
      sourcePrompt: "Eve authored this",
      provider: "eve",
      model: "eve-agent",
    });

    expect(state.createCounts.screens).toBe(1);
    expect(screen.currentVersionId).toBe(screenVersion.id);
    expect(screenVersion.versionNumber).toBe(1);
    expect(screenVersion.operation).toBe("generate");
  });

  it("appends an agent-authored edit version to an existing screen", async () => {
    const seedScreen: Screen = {
      id: "screen_a",
      projectId: "proj_1",
      title: "Dashboard",
      deviceType: "desktop",
      currentVersionId: "ver_a",
      createdAt: "2026-06-18T09:00:00.000Z",
      updatedAt: "2026-06-18T09:00:00.000Z",
    };
    const seedVersion: ScreenVersion = {
      id: "ver_a",
      screenId: "screen_a",
      versionNumber: 1,
      sourcePrompt: "base",
      operation: "generate",
      designSpec: completedInput.designSpec,
      htmlCode: "<html></html>",
      reactCode: null,
      screenshotArtifactId: null,
      parentVersionId: null,
      createdAt: "2026-06-18T09:00:00.000Z",
    };
    const state = createRepositoryState({ seed: { screen: seedScreen, version: seedVersion } });
    const persister = createGenerationResultPersister(state.unitOfWork);

    const { screen, screenVersion } = await persister.persistAuthoredScreenVersion({
      projectId: "proj_1",
      designSpec: completedInput.designSpec,
      htmlCode: "<html></html>",
      reactCode: null,
      sourcePrompt: "Eve edit",
      provider: "eve",
      model: "eve-agent",
      baseScreenId: "screen_a",
    });

    expect(state.createCounts.screens).toBe(0);
    expect(screen.id).toBe("screen_a");
    expect(screen.currentVersionId).toBe(screenVersion.id);
    expect(screenVersion.versionNumber).toBe(2);
    expect(screenVersion.operation).toBe("edit");
    expect(screenVersion.parentVersionId).toBe("ver_a");
  });

  it("appends a new version to the existing screen for an edit job", async () => {
    const seedScreen: Screen = {
      id: "screen_seed",
      projectId: "proj_1",
      title: "Dashboard",
      deviceType: "desktop",
      currentVersionId: "ver_seed",
      createdAt: "2026-06-18T09:00:00.000Z",
      updatedAt: "2026-06-18T09:00:00.000Z",
    };
    const seedVersion: ScreenVersion = {
      id: "ver_seed",
      screenId: "screen_seed",
      versionNumber: 1,
      sourcePrompt: "Create a dashboard",
      operation: "generate",
      designSpec: completedInput.designSpec,
      htmlCode: "<html></html>",
      reactCode: null,
      screenshotArtifactId: null,
      parentVersionId: null,
      createdAt: "2026-06-18T09:00:00.000Z",
    };

    const state = createRepositoryState({ seed: { screen: seedScreen, version: seedVersion } });
    const persister = createGenerationResultPersister(state.unitOfWork);

    const result = await persister.persistCompletedGeneration({
      ...completedInput,
      prompt: "Tighten the spacing",
      edit: { screenId: "screen_seed", baseVersionId: "ver_seed" },
    });

    expect(state.createCounts.screens).toBe(0);
    expect(result.screen.id).toBe("screen_seed");
    expect(result.screen.currentVersionId).toBe(result.screenVersion.id);
    expect(result.screenVersion.versionNumber).toBe(2);
    expect(result.screenVersion.operation).toBe("edit");
    expect(result.screenVersion.parentVersionId).toBe("ver_seed");
  });

  it("rejects completion when the job has not been acquired", async () => {
    const state = createRepositoryState({ status: "queued" });
    const persister = createGenerationResultPersister(state.unitOfWork);

    await expect(persister.persistCompletedGeneration(completedInput)).rejects.toThrow(
      "cannot complete from status queued",
    );
    expect(state.createCounts).toEqual({ screens: 0, versions: 0, artifacts: 0 });
  });
});

function createRepositoryState(
  options: { status?: GenerationJob["status"]; seed?: { screen: Screen; version: ScreenVersion } } = {},
) {
  let job: GenerationJob = {
    id: "job_1",
    projectId: "proj_1",
    type: "generate_screen",
    status: options.status ?? "running",
    prompt: "Create a dashboard",
    deviceType: "desktop",
    mode: "fast",
    result: null,
    error: null,
    createdAt: "2026-06-18T10:00:00.000Z",
    updatedAt: "2026-06-18T10:00:00.000Z",
  };
  const screens = new Map<string, Screen>();
  const versions = new Map<string, ScreenVersion>();
  const artifacts = new Map<string, Artifact>();
  const createCounts = { screens: 0, versions: 0, artifacts: 0 };

  if (options.seed) {
    screens.set(options.seed.screen.id, options.seed.screen);
    versions.set(options.seed.version.id, options.seed.version);
  }

  const repositories: GenerationRepositories = {
    generationJobs: {
      async createQueued() {
        throw new Error("not used");
      },
      async findById(jobId) {
        return jobId === job.id ? job : null;
      },
      async findByIdForUpdate(jobId) {
        return jobId === job.id ? job : null;
      },
      async listQueued() {
        return job.status === "queued" ? [job] : [];
      },
      async acquireQueued() {
        throw new Error("not used");
      },
      async renewLease() {
        return false;
      },
      async requeueExpiredRunning() {
        return [];
      },
      async cancel() {
        return null;
      },
      async releaseForRetry() {
        throw new Error("not used");
      },
      async complete(jobId, result) {
        if (jobId !== job.id || job.status !== "running") throw new Error("invalid completion");
        job = {
          ...job,
          status: "completed",
          result,
          error: null,
          updatedAt: "2026-06-18T10:01:00.000Z",
        };
        return job;
      },
      async fail() {
        throw new Error("not used");
      },
    },
    screens: {
      async create(input) {
        createCounts.screens += 1;
        const screen: Screen = {
          id: `screen_${createCounts.screens}`,
          projectId: input.projectId,
          title: input.title,
          deviceType: input.deviceType,
          currentVersionId: input.currentVersionId ?? "",
          createdAt: "2026-06-18T10:01:00.000Z",
          updatedAt: "2026-06-18T10:01:00.000Z",
        };
        screens.set(screen.id, screen);
        return screen;
      },
      async findById(screenId) {
        return screens.get(screenId) ?? null;
      },
      async listByProject(projectId) {
        return [...screens.values()].filter((screen) => screen.projectId === projectId);
      },
      async setCurrentVersion(screenId, screenVersionId) {
        const existing = screens.get(screenId);
        if (!existing) throw new Error(`Screen ${screenId} not found`);
        const updated: Screen = { ...existing, currentVersionId: screenVersionId };
        screens.set(screenId, updated);
        return updated;
      },
    },
    screenVersions: {
      async create(input) {
        createCounts.versions += 1;
        const version: ScreenVersion = {
          id: input.id ?? `ver_${createCounts.versions}`,
          screenId: input.screenId,
          versionNumber: input.versionNumber,
          sourcePrompt: input.sourcePrompt,
          operation: input.operation,
          designSpec: input.designSpec,
          htmlCode: input.htmlCode,
          reactCode: input.reactCode,
          screenshotArtifactId: input.screenshotArtifactId,
          parentVersionId: input.parentVersionId,
          createdAt: "2026-06-18T10:01:00.000Z",
        };
        versions.set(version.id, version);
        return version;
      },
      async findById(versionId) {
        return versions.get(versionId) ?? null;
      },
      async listByScreen(screenId) {
        return [...versions.values()]
          .filter((version) => version.screenId === screenId)
          .map(({ htmlCode: _htmlCode, designSpec: _designSpec, sourcePrompt: _sourcePrompt, reactCode: _reactCode, ...summary }) => summary);
      },
    },
    artifacts: {
      async create(input) {
        createCounts.artifacts += 1;
        const artifact: Artifact = {
          id: input.id ?? `artifact_${createCounts.artifacts}`,
          projectId: input.projectId,
          screenVersionId: input.screenVersionId,
          type: input.type,
          storageKey: input.storageKey,
          checksum: input.checksum,
          mimeType: input.mimeType,
          byteSize: input.byteSize,
          width: input.width,
          height: input.height,
          metadata: input.metadata,
          createdAt: "2026-06-18T10:01:00.000Z",
        };
        artifacts.set(artifact.id, artifact);
        return artifact;
      },
      async findById(artifactId) {
        return artifacts.get(artifactId) ?? null;
      },
      async listByScreenVersion(screenVersionId) {
        return [...artifacts.values()].filter(
          (artifact) => artifact.screenVersionId === screenVersionId,
        );
      },
    },
  };

  const unitOfWork: GenerationUnitOfWork = {
    async transaction(callback) {
      return callback(repositories);
    },
  };

  return {
    unitOfWork,
    createCounts,
    get job() {
      return job;
    },
  };
}

const completedInput = {
  jobId: "job_1",
  projectId: "proj_1",
  prompt: "Create a dashboard",
  deviceType: "desktop" as const,
  provider: "mock",
  model: "mock-v1",
  designSpec: {
    schemaVersion: "1.0",
    title: "Dashboard",
    deviceType: "desktop",
    viewport: { width: 1440, height: 1024 },
    themeRefs: { designSystemId: null },
    root: {
      id: "root",
      type: "frame",
      name: "Dashboard",
      layout: { position: "relative", width: 1440, height: 1024 },
      style: {},
      content: {},
      children: [],
    },
    interactions: [],
    assets: [],
  } satisfies DesignSpec,
  htmlCode: "<html><body>Dashboard</body></html>",
  reactCode: null,
  screenshot: {
    storageKey: "generation-jobs/job_1/screenshot.png",
    checksum: "sha256:abc",
    mimeType: "image/png",
    byteSize: 3,
    width: 1440,
    height: 1024,
  },
};
