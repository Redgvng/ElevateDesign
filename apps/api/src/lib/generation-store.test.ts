import { describe, expect, it } from "vitest";
import type { GenerationJobRepository } from "@odc/db";
import type { CreateGenerationJobInput, Project } from "@odc/shared";
import {
  createQueuedGenerationStore,
  GenerationProjectNotFoundError,
  type GenerationQueue,
} from "./generation-store";

const now = "2026-06-18T12:00:00.000Z";

const project: Project = {
  id: "proj_test",
  name: "Test Project",
  slug: "test-project",
  createdAt: now,
  updatedAt: now,
  defaultDesignSystemId: null,
};

const input: CreateGenerationJobInput = {
  type: "generate_screen",
  prompt: "Create a dense dashboard",
  deviceType: "desktop",
  mode: "fast",
};

describe("createQueuedGenerationStore", () => {
  it("persists a queued job and enqueues the stable job id", async () => {
    const enqueuedJobIds: string[] = [];
    const generationJobs = createRepositoryStub({
      createQueued: async (projectId, jobInput) => ({
        id: "job_queued",
        projectId,
        type: jobInput.type,
        status: "queued",
        prompt: jobInput.prompt,
        deviceType: jobInput.deviceType,
        mode: jobInput.mode,
        result: null,
        error: null,
        createdAt: now,
        updatedAt: now,
      }),
    });
    const queue: GenerationQueue = {
      enqueueGenerationJob: async (jobId) => {
        enqueuedJobIds.push(jobId);
      },
      removeGenerationJob: async () => false,
    };
    const store = createQueuedGenerationStore({
      projectStore: {
        createProject: async () => project,
        listProjects: async () => [project],
        getProject: async () => project,
        getCanvas: async () => null,
        updateCanvas: async () => null,
      },
      generationJobs,
      queue,
    });

    const stored = await store.createJob(project.id, input);

    expect(stored).toEqual({
      job: expect.objectContaining({
        id: "job_queued",
        projectId: project.id,
        status: "queued",
        result: null,
        error: null,
      }),
    });
    expect(enqueuedJobIds).toEqual(["job_queued"]);
  });

  it("dispatches to Eve instead of the legacy queue when an eve dispatcher is set", async () => {
    const enqueuedJobIds: string[] = [];
    const dispatchedJobIds: string[] = [];
    const generationJobs = createRepositoryStub({
      createQueued: async (projectId, jobInput) => ({
        id: "job_eve",
        projectId,
        type: jobInput.type,
        status: "queued",
        prompt: jobInput.prompt,
        deviceType: jobInput.deviceType,
        mode: jobInput.mode,
        result: null,
        error: null,
        createdAt: now,
        updatedAt: now,
      }),
    });
    const store = createQueuedGenerationStore({
      projectStore: {
        createProject: async () => project,
        listProjects: async () => [project],
        getProject: async () => project,
        getCanvas: async () => null,
        updateCanvas: async () => null,
      },
      generationJobs,
      queue: {
        enqueueGenerationJob: async (jobId) => {
          enqueuedJobIds.push(jobId);
        },
        removeGenerationJob: async () => false,
      },
      eveDispatcher: {
        dispatch: async (job) => {
          dispatchedJobIds.push(job.id);
        },
      },
    });

    await store.createJob(project.id, input);

    expect(dispatchedJobIds).toEqual(["job_eve"]);
    expect(enqueuedJobIds).toEqual([]);
  });

  it("does not expose a job whose project is outside the current workspace", async () => {
    const generationJob = await createRepositoryStub({
      findById: async () => ({
        id: "job_hidden",
        projectId: "proj_other_workspace",
        type: input.type,
        status: "queued",
        prompt: input.prompt,
        deviceType: input.deviceType,
        mode: input.mode,
        result: null,
        error: null,
        createdAt: now,
        updatedAt: now,
      }),
    });
    const store = createQueuedGenerationStore({
      projectStore: {
        createProject: async () => project,
        listProjects: async () => [],
        getProject: async () => null,
        getCanvas: async () => null,
        updateCanvas: async () => null,
      },
      generationJobs: generationJob,
      queue: {
        enqueueGenerationJob: async () => undefined,
        removeGenerationJob: async () => false,
      },
    });

    await expect(store.getJob("job_hidden")).resolves.toBeNull();
  });

  it("does not create a job for an unknown project", async () => {
    const store = createQueuedGenerationStore({
      projectStore: {
        createProject: async () => project,
        listProjects: async () => [],
        getProject: async () => null,
        getCanvas: async () => null,
        updateCanvas: async () => null,
      },
      generationJobs: createRepositoryStub({
        createQueued: async () => {
          throw new Error("should not create a job");
        },
      }),
      queue: {
        enqueueGenerationJob: async () => {
          throw new Error("should not enqueue");
        },
        removeGenerationJob: async () => false,
      },
    });

    await expect(store.createJob("missing", input)).rejects.toBeInstanceOf(
      GenerationProjectNotFoundError,
    );
  });
});

function createRepositoryStub(
  overrides: Partial<GenerationJobRepository>,
): GenerationJobRepository {
  return {
    createQueued: async () => {
      throw new Error("not implemented");
    },
    findById: async () => null,
    findByIdForUpdate: async () => null,
    listQueued: async () => [],
    acquireQueued: async () => null,
    renewLease: async () => false,
    requeueExpiredRunning: async () => [],
    cancel: async () => null,
    releaseForRetry: async () => {
      throw new Error("not implemented");
    },
    complete: async () => {
      throw new Error("not implemented");
    },
    fail: async () => {
      throw new Error("not implemented");
    },
    ...overrides,
  } as GenerationJobRepository;
}
