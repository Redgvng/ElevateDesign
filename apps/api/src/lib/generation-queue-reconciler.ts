import type { GenerationJobRepository } from "@odc/db";
import type { GenerationQueue } from "./generation-store";

export type GenerationQueueReconcileReport = {
  recovered: number;
  scanned: number;
  enqueued: number;
  failed: number;
};

export type GenerationQueueReconciler = {
  reconcileOnce(): Promise<GenerationQueueReconcileReport>;
  stop(): void;
};

export function startGenerationQueueReconciler({
  generationJobs,
  queue,
  intervalMs = 15_000,
  batchSize = 100,
  onError = defaultOnError,
  now = () => new Date(),
}: {
  generationJobs: Pick<GenerationJobRepository, "listQueued" | "requeueExpiredRunning">;
  queue: GenerationQueue;
  intervalMs?: number;
  batchSize?: number;
  onError?: (error: unknown, jobId?: string) => void;
  now?: () => Date;
}): GenerationQueueReconciler {
  let activeReconciliation: Promise<GenerationQueueReconcileReport> | null = null;

  const reconcileOnce = (): Promise<GenerationQueueReconcileReport> => {
    if (activeReconciliation) return activeReconciliation;

    activeReconciliation = reconcileQueuedJobs({
      generationJobs,
      queue,
      batchSize,
      onError,
      now,
    }).finally(() => {
      activeReconciliation = null;
    });
    return activeReconciliation;
  };

  const interval = setInterval(() => {
    void reconcileOnce().catch((error) => onError(error));
  }, intervalMs);
  interval.unref();
  void reconcileOnce().catch((error) => onError(error));

  return {
    reconcileOnce,
    stop() {
      clearInterval(interval);
    },
  };
}

async function reconcileQueuedJobs({
  generationJobs,
  queue,
  batchSize,
  onError,
  now,
}: {
  generationJobs: Pick<GenerationJobRepository, "listQueued" | "requeueExpiredRunning">;
  queue: GenerationQueue;
  batchSize: number;
  onError: (error: unknown, jobId?: string) => void;
  now: () => Date;
}): Promise<GenerationQueueReconcileReport> {
  const recoveredJobs = await generationJobs.requeueExpiredRunning(now(), batchSize);
  const queuedJobs = await generationJobs.listQueued(batchSize);
  let enqueued = 0;
  let failed = 0;

  for (const job of queuedJobs) {
    try {
      await queue.enqueueGenerationJob(job.id);
      enqueued += 1;
    } catch (error) {
      failed += 1;
      onError(error, job.id);
    }
  }

  return {
    recovered: recoveredJobs.length,
    scanned: queuedJobs.length,
    enqueued,
    failed,
  };
}

function defaultOnError(error: unknown, jobId?: string): void {
  const prefix = jobId
    ? `Failed to reconcile generation job ${jobId}`
    : "Generation queue reconciliation failed";
  console.error(prefix, error);
}
