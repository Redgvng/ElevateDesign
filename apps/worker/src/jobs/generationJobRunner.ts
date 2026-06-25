import type { GenerationJob } from "@odc/shared";
import type { GenerationJobFailure } from "@odc/db";
import {
  GenerationProcessingError,
  type GenerationJobProcessor,
} from "./generationJobProcessor";

export type GenerationJobRunnerRepositories = {
  generationJobs: {
    findById(jobId: string): Promise<GenerationJob | null>;
    acquireQueued(jobId: string, leaseDurationMs: number): Promise<GenerationJob | null>;
    renewLease(jobId: string, leaseDurationMs: number): Promise<boolean>;
    releaseForRetry(jobId: string, error: GenerationJobFailure): Promise<GenerationJob>;
    fail(jobId: string, error: GenerationJobFailure): Promise<GenerationJob>;
  };
};

export type GenerationJobRunner = {
  processGenerationJobId(
    jobId: string,
    options?: { canRetry?: boolean },
  ): Promise<{
    job: GenerationJob;
    screenVersion?: unknown;
    artifacts?: unknown[];
  } | null>;
};

export type GenerationJobLogger = {
  info(event: string, context: Record<string, unknown>): void;
  error(event: string, context: Record<string, unknown>): void;
};

export function createGenerationJobRunner({
  repositories,
  processor,
  leaseDurationMs = 120_000,
  heartbeatIntervalMs = 30_000,
  onLeaseRenewalError = defaultLeaseRenewalErrorHandler,
  logger = defaultGenerationJobLogger,
}: {
  repositories: GenerationJobRunnerRepositories;
  processor: GenerationJobProcessor;
  leaseDurationMs?: number;
  heartbeatIntervalMs?: number;
  onLeaseRenewalError?: (error: unknown, jobId: string) => void;
  logger?: GenerationJobLogger;
}): GenerationJobRunner {
  validateLeaseSettings(leaseDurationMs, heartbeatIntervalMs);

  return {
    async processGenerationJobId(jobId, options = {}) {
      const job = await repositories.generationJobs.acquireQueued(jobId, leaseDurationMs);
      if (!job) return null;

      const stopHeartbeat = startLeaseHeartbeat({
        jobId: job.id,
        leaseDurationMs,
        heartbeatIntervalMs,
        renewLease: repositories.generationJobs.renewLease,
        onError: onLeaseRenewalError,
      });

      try {
        const result = await processor.process(job);
        logger.info("generation_job_completed", {
          jobId: job.id,
          projectId: job.projectId,
          type: job.type,
        });
        return result;
      } catch (error) {
        const latestJob = await repositories.generationJobs.findById(job.id);
        if (latestJob?.status === "cancelled") {
          logger.info("generation_job_cancelled", { jobId: job.id, projectId: job.projectId });
          return { job: latestJob };
        }

        const failure = toGenerationJobFailure(error);
        if (failure.retryable && options.canRetry) {
          logger.error("generation_job_released_for_retry", {
            jobId: job.id,
            projectId: job.projectId,
            code: failure.code,
            message: failure.message,
          });
          await repositories.generationJobs.releaseForRetry(job.id, failure);
          throw error instanceof Error ? error : new Error(failure.message);
        }

        const failedJob = await repositories.generationJobs.fail(job.id, failure);
        logger.error("generation_job_failed", {
          jobId: job.id,
          projectId: job.projectId,
          code: failure.code,
          message: failure.message,
          retryable: failure.retryable,
        });
        return { job: failedJob };
      } finally {
        stopHeartbeat();
      }
    },
  };
}

function startLeaseHeartbeat({
  jobId,
  leaseDurationMs,
  heartbeatIntervalMs,
  renewLease,
  onError,
}: {
  jobId: string;
  leaseDurationMs: number;
  heartbeatIntervalMs: number;
  renewLease: (jobId: string, leaseDurationMs: number) => Promise<boolean>;
  onError: (error: unknown, jobId: string) => void;
}): () => void {
  let stopped = false;
  let renewalInFlight = false;

  const interval = setInterval(() => {
    if (stopped || renewalInFlight) return;
    renewalInFlight = true;

    void renewLease(jobId, leaseDurationMs)
      .then((renewed) => {
        if (!renewed) {
          onError(new Error("Generation job lease is no longer active"), jobId);
        }
      })
      .catch((error) => onError(error, jobId))
      .finally(() => {
        renewalInFlight = false;
      });
  }, heartbeatIntervalMs);
  interval.unref();

  return () => {
    stopped = true;
    clearInterval(interval);
  };
}

function validateLeaseSettings(leaseDurationMs: number, heartbeatIntervalMs: number): void {
  if (!Number.isFinite(leaseDurationMs) || leaseDurationMs < 5_000) {
    throw new Error("Generation job lease duration must be at least 5000ms");
  }
  if (!Number.isFinite(heartbeatIntervalMs) || heartbeatIntervalMs < 1_000) {
    throw new Error("Generation job heartbeat interval must be at least 1000ms");
  }
  if (heartbeatIntervalMs >= leaseDurationMs) {
    throw new Error("Generation job heartbeat interval must be shorter than its lease");
  }
}

function defaultLeaseRenewalErrorHandler(error: unknown, jobId: string): void {
  console.error(`Failed to renew generation job lease ${jobId}`, error);
}

const defaultGenerationJobLogger: GenerationJobLogger = {
  info(event, context) {
    console.log(JSON.stringify({ level: "info", event, ...context }));
  },
  error(event, context) {
    console.error(JSON.stringify({ level: "error", event, ...context }));
  },
};

function toGenerationJobFailure(error: unknown): GenerationJobFailure {
  if (error instanceof GenerationProcessingError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      retryable: error.retryable,
    };
  }

  return {
    code: "WORKER_ERROR",
    message: error instanceof Error ? error.message : "Generation worker failed",
    retryable: true,
  };
}
