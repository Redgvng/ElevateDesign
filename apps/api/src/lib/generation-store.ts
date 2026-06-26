import { randomUUID } from "node:crypto";
import type { GenerationJobFailure, GenerationJobRepository } from "@odc/db";
import {
  designSystemToPromptContext,
  type CreateGenerationJobInput,
  type GenerationJob,
} from "@odc/shared";
import type { DesignSystemStore } from "./design-system-store";
import type { EveGenerationDispatcher } from "./eve-dispatch";
import type { ProjectStore } from "./project-store";

export type StoredGeneration = {
  job: GenerationJob;
};

export type GenerationStore = {
  createJob(projectId: string, input: CreateGenerationJobInput): Promise<StoredGeneration>;
  getJob(jobId: string): Promise<StoredGeneration | null>;
  cancelJob(jobId: string): Promise<StoredGeneration | null>;
};

export type GenerationQueue = {
  enqueueGenerationJob(jobId: string): Promise<void>;
  removeGenerationJob(jobId: string): Promise<boolean>;
};

export type QueuedGenerationStoreOptions = {
  projectStore: ProjectStore;
  generationJobs: Pick<GenerationJobRepository, "createQueued" | "findById" | "cancel">;
  queue: GenerationQueue;
  designSystemStore?: DesignSystemStore;
  /** When set, queued jobs are dispatched to Eve instead of the legacy queue. */
  eveDispatcher?: EveGenerationDispatcher;
};

export function createQueuedGenerationStore({
  projectStore,
  generationJobs,
  queue,
  designSystemStore,
  eveDispatcher,
}: QueuedGenerationStoreOptions): GenerationStore {
  return {
    async createJob(projectId, input) {
      const project = await projectStore.getProject(projectId);
      if (!project) throw new GenerationProjectNotFoundError();

      const designContext = designSystemStore
        ? await resolveDesignContext(designSystemStore, project.id, project.defaultDesignSystemId)
        : null;

      const job = await generationJobs.createQueued(projectId, input, { designContext });

      if (eveDispatcher) {
        await eveDispatcher.dispatch(job);
      } else {
        await queue.enqueueGenerationJob(job.id);
      }
      return { job };
    },

    async getJob(jobId) {
      const job = await generationJobs.findById(jobId);
      if (!job) return null;

      const project = await projectStore.getProject(job.projectId);
      return project ? { job } : null;
    },

    async cancelJob(jobId) {
      const job = await generationJobs.findById(jobId);
      if (!job) return null;

      const project = await projectStore.getProject(job.projectId);
      if (!project) return null;

      if (job.status === "completed" || job.status === "failed") {
        throw new GenerationJobNotCancellableError(job.status);
      }
      if (job.status === "cancelled") return { job };

      const cancelledJob = await generationJobs.cancel(jobId);
      if (!cancelledJob) {
        const latestJob = await generationJobs.findById(jobId);
        if (latestJob?.status === "cancelled") return { job: latestJob };
        throw new GenerationJobNotCancellableError(latestJob?.status ?? job.status);
      }

      await queue.removeGenerationJob(jobId).catch(() => false);
      return { job: cancelledJob };
    },
  };
}

async function resolveDesignContext(
  designSystemStore: DesignSystemStore,
  projectId: string,
  defaultDesignSystemId: string | null,
): Promise<string | null> {
  const systems = await designSystemStore.listByProject(projectId);
  if (systems.length === 0) return null;

  const selected =
    (defaultDesignSystemId
      ? systems.find((system) => system.id === defaultDesignSystemId)
      : undefined) ?? systems[0];

  return designSystemToPromptContext(selected);
}

export function createInMemoryGenerationJobRepository(): GenerationJobRepository {
  const jobs = new Map<string, GenerationJob>();
  const leaseExpiresAtByJobId = new Map<string, number>();

  return {
    async createQueued(projectId, input, options) {
      const now = new Date().toISOString();
      const job: GenerationJob = {
        id: `job_${randomUUID()}`,
        projectId,
        type: input.type,
        status: "queued",
        prompt: input.prompt,
        deviceType: input.deviceType,
        mode: input.mode,
        targetScreenId:
          input.type === "edit_screen" || input.type === "generate_variants"
            ? input.screenId
            : null,
        variantCount: input.type === "generate_variants" ? input.count : null,
        designContext: options?.designContext ?? null,
        result: null,
        error: null,
        createdAt: now,
        updatedAt: now,
      };
      jobs.set(job.id, job);
      return job;
    },

    async findById(jobId) {
      return jobs.get(jobId) ?? null;
    },

    async findByIdForUpdate(jobId) {
      return jobs.get(jobId) ?? null;
    },

    async listQueued(limit) {
      return [...jobs.values()]
        .filter((job) => job.status === "queued")
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .slice(0, limit);
    },

    async acquireQueued(jobId, leaseDurationMs) {
      const existing = jobs.get(jobId);
      if (!existing || existing.status !== "queued") return null;

      const running: GenerationJob = {
        ...existing,
        status: "running",
        error: null,
        updatedAt: new Date().toISOString(),
      };
      jobs.set(jobId, running);
      leaseExpiresAtByJobId.set(jobId, Date.now() + normalizeLeaseDuration(leaseDurationMs));
      return running;
    },

    async renewLease(jobId, leaseDurationMs) {
      const existing = jobs.get(jobId);
      if (!existing || existing.status !== "running") return false;
      leaseExpiresAtByJobId.set(jobId, Date.now() + normalizeLeaseDuration(leaseDurationMs));
      return true;
    },

    async requeueExpiredRunning(now, limit) {
      const expired = [...jobs.values()]
        .filter(
          (job) =>
            job.status === "running" &&
            (leaseExpiresAtByJobId.get(job.id) ?? Number.POSITIVE_INFINITY) <= now.getTime(),
        )
        .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
        .slice(0, limit)
        .map((job) => {
          const queued: GenerationJob = {
            ...job,
            status: "queued",
            error: {
              code: "WORKER_LEASE_EXPIRED",
              message: "The generation worker stopped renewing its lease",
            },
            updatedAt: now.toISOString(),
          };
          jobs.set(job.id, queued);
          leaseExpiresAtByJobId.delete(job.id);
          return queued;
        });

      return expired;
    },

    async cancel(jobId) {
      const existing = jobs.get(jobId);
      if (!existing) return null;
      if (existing.status === "cancelled") return existing;
      if (existing.status !== "queued" && existing.status !== "running") return null;

      const cancelled: GenerationJob = {
        ...existing,
        status: "cancelled",
        error: null,
        updatedAt: new Date().toISOString(),
      };
      jobs.set(jobId, cancelled);
      leaseExpiresAtByJobId.delete(jobId);
      return cancelled;
    },

    async releaseForRetry(jobId, error) {
      const existing = jobs.get(jobId);
      if (!existing || existing.status !== "running") {
        throw new Error(`Generation job ${jobId} cannot be released for retry`);
      }

      const queued: GenerationJob = {
        ...existing,
        status: "queued",
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        updatedAt: new Date().toISOString(),
      };
      jobs.set(jobId, queued);
      leaseExpiresAtByJobId.delete(jobId);
      return queued;
    },

    async complete(jobId, result) {
      const existing = jobs.get(jobId);
      if (!existing) throw new Error(`Generation job ${jobId} not found`);
      if (existing.status === "completed" && existing.result) return existing;
      if (existing.status !== "running") {
        throw new Error(`Generation job ${jobId} cannot complete from status ${existing.status}`);
      }

      const completed: GenerationJob = {
        ...existing,
        status: "completed",
        result,
        error: null,
        updatedAt: new Date().toISOString(),
      };
      jobs.set(jobId, completed);
      leaseExpiresAtByJobId.delete(jobId);
      return completed;
    },

    async fail(jobId, error: GenerationJobFailure) {
      const existing = jobs.get(jobId);
      if (!existing) throw new Error(`Generation job ${jobId} not found`);
      if (existing.status !== "queued" && existing.status !== "running") return existing;

      const failed: GenerationJob = {
        ...existing,
        status: "failed",
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        updatedAt: new Date().toISOString(),
      };
      jobs.set(jobId, failed);
      leaseExpiresAtByJobId.delete(jobId);
      return failed;
    },
  };
}

function normalizeLeaseDuration(leaseDurationMs: number): number {
  if (!Number.isFinite(leaseDurationMs) || leaseDurationMs < 1_000) {
    throw new Error("Generation job lease duration must be at least 1000ms");
  }

  return Math.floor(leaseDurationMs);
}

export class GenerationJobNotCancellableError extends Error {
  constructor(public readonly status: GenerationJob["status"]) {
    super(`Generation job cannot be cancelled from status ${status}`);
    this.name = "GenerationJobNotCancellableError";
  }
}

export class GenerationProjectNotFoundError extends Error {
  constructor() {
    super("Project not found");
    this.name = "GenerationProjectNotFoundError";
  }
}
