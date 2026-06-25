import { describe, expect, it, vi } from "vitest";
import type { GenerationJob } from "@odc/shared";
import { startGenerationQueueReconciler } from "./generation-queue-reconciler";

describe("startGenerationQueueReconciler", () => {
  it("re-enqueues queued PostgreSQL jobs and reports isolated failures", async () => {
    const enqueued: string[] = [];
    const errors: Array<{ jobId?: string; message: string }> = [];
    const reconciler = startGenerationQueueReconciler({
      generationJobs: {
        requeueExpiredRunning: async () => [],
        listQueued: async () => [queuedJob("job_1"), queuedJob("job_2")],
      },
      queue: {
        enqueueGenerationJob: async (jobId) => {
          if (jobId === "job_2") throw new Error("redis unavailable");
          enqueued.push(jobId);
        },
        removeGenerationJob: async () => false,
      },
      intervalMs: 60_000,
      onError: (error, jobId) => {
        errors.push({
          jobId,
          message: error instanceof Error ? error.message : String(error),
        });
      },
    });

    try {
      const report = await reconciler.reconcileOnce();

      expect(report).toEqual({ recovered: 0, scanned: 2, enqueued: 1, failed: 1 });
      expect(enqueued).toEqual(["job_1"]);
      expect(errors).toEqual([{ jobId: "job_2", message: "redis unavailable" }]);
    } finally {
      reconciler.stop();
    }
  });

  it("recovers expired running jobs before enqueueing queued work", async () => {
    const calls: string[] = [];
    const recovered = queuedJob("job_recovered");
    const reconciler = startGenerationQueueReconciler({
      generationJobs: {
        requeueExpiredRunning: async (now, limit) => {
          calls.push(`recover:${now.toISOString()}:${limit}`);
          return [recovered];
        },
        listQueued: async () => {
          calls.push("list");
          return [recovered];
        },
      },
      queue: {
        enqueueGenerationJob: async (jobId) => {
          calls.push(`enqueue:${jobId}`);
        },
        removeGenerationJob: async () => false,
      },
      intervalMs: 60_000,
      batchSize: 25,
      now: () => new Date("2026-06-18T12:00:00.000Z"),
    });

    try {
      const report = await reconciler.reconcileOnce();

      expect(report).toEqual({ recovered: 1, scanned: 1, enqueued: 1, failed: 0 });
      expect(calls).toEqual([
        "recover:2026-06-18T12:00:00.000Z:25",
        "list",
        "enqueue:job_recovered",
      ]);
    } finally {
      reconciler.stop();
    }
  });

  it("coalesces overlapping reconciliation passes", async () => {
    let release: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const listQueued = vi.fn(async () => {
      await blocked;
      return [];
    });
    const reconciler = startGenerationQueueReconciler({
      generationJobs: {
        requeueExpiredRunning: async () => [],
        listQueued,
      },
      queue: {
        enqueueGenerationJob: async () => undefined,
        removeGenerationJob: async () => false,
      },
      intervalMs: 60_000,
    });

    try {
      const first = reconciler.reconcileOnce();
      const second = reconciler.reconcileOnce();
      release?.();

      await Promise.all([first, second]);
      expect(listQueued).toHaveBeenCalledOnce();
    } finally {
      reconciler.stop();
    }
  });
});

function queuedJob(id: string): GenerationJob {
  return {
    id,
    projectId: "proj_1",
    type: "generate_screen",
    status: "queued",
    prompt: "Create a dashboard",
    deviceType: "desktop",
    mode: "fast",
    result: null,
    error: null,
    createdAt: "2026-06-18T10:00:00.000Z",
    updatedAt: "2026-06-18T10:00:00.000Z",
  };
}
