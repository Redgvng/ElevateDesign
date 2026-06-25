import { describe, expect, it, vi } from "vitest";
import type { GenerationJob } from "@odc/shared";
import { createGenerationJobRunner, type GenerationJobRunnerRepositories } from "./generationJobRunner";
import { GenerationProcessingError } from "./generationJobProcessor";

describe("createGenerationJobRunner", () => {
  it("acquires a queued job before processing it", async () => {
    const calls: string[] = [];
    const repositories: GenerationJobRunnerRepositories = {
      generationJobs: {
        findById: async () => null,
        acquireQueued: async (jobId, leaseDurationMs) => {
          calls.push(`acquire:${jobId}:${leaseDurationMs}`);
          return { ...job, status: "running" };
        },
        renewLease: async () => true,
        releaseForRetry: async () => {
          throw new Error("should not retry successful job");
        },
        fail: async () => {
          throw new Error("should not fail successful job");
        },
      },
    };
    const runner = createGenerationJobRunner({
      repositories,
      processor: {
        process: async (runningJob) => {
          calls.push(`process:${runningJob.status}`);
          return { job: { ...runningJob, status: "completed" }, screenVersion };
        },
      },
    });

    const result = await runner.processGenerationJobId("job_1");

    expect(calls).toEqual(["acquire:job_1:120000", "process:running"]);
    expect(result?.job.status).toBe("completed");
  });

  it("renews the lease while processing and stops after completion", async () => {
    vi.useFakeTimers();
    let finishProcessing: (() => void) | undefined;
    const processingGate = new Promise<void>((resolve) => {
      finishProcessing = resolve;
    });
    const renewLease = vi.fn(async () => true);
    const runner = createGenerationJobRunner({
      repositories: {
        generationJobs: {
          findById: async () => null,
          acquireQueued: async () => ({ ...job, status: "running" }),
          renewLease,
          releaseForRetry: async () => {
            throw new Error("should not retry successful job");
          },
          fail: async () => {
            throw new Error("should not fail successful job");
          },
        },
      },
      processor: {
        process: async (runningJob) => {
          await processingGate;
          return { job: { ...runningJob, status: "completed" }, screenVersion };
        },
      },
      leaseDurationMs: 5_000,
      heartbeatIntervalMs: 1_000,
    });

    try {
      const processing = runner.processGenerationJobId("job_1");
      await vi.advanceTimersByTimeAsync(2_100);
      expect(renewLease).toHaveBeenCalledTimes(2);
      expect(renewLease).toHaveBeenLastCalledWith("job_1", 5_000);

      finishProcessing?.();
      await processing;
      await vi.advanceTimersByTimeAsync(2_000);
      expect(renewLease).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns null when the job is not queued", async () => {
    const runner = createGenerationJobRunner({
      repositories: {
        generationJobs: {
          findById: async () => null,
          acquireQueued: async () => null,
          renewLease: async () => false,
          releaseForRetry: async () => {
            throw new Error("should not retry non-acquired jobs");
          },
          fail: async () => {
            throw new Error("should not fail non-acquired jobs");
          },
        },
      },
      processor: {
        process: async () => {
          throw new Error("should not process non-acquired jobs");
        },
      },
    });

    await expect(runner.processGenerationJobId("job_1")).resolves.toBeNull();
  });

  it("preserves cancellation when a running processor finishes after the user cancels", async () => {
    const cancelledJob: GenerationJob = { ...job, status: "cancelled" };
    const runner = createGenerationJobRunner({
      repositories: {
        generationJobs: {
          findById: async () => cancelledJob,
          acquireQueued: async () => ({ ...job, status: "running" }),
          renewLease: async () => true,
          releaseForRetry: async () => {
            throw new Error("cancelled jobs must not retry");
          },
          fail: async () => {
            throw new Error("cancelled jobs must not fail");
          },
        },
      },
      processor: {
        process: async () => {
          throw new GenerationProcessingError(
            "PERSISTENCE_ERROR",
            "Job was cancelled before completion",
            undefined,
            true,
          );
        },
      },
    });

    await expect(runner.processGenerationJobId("job_1", { canRetry: true })).resolves.toEqual({
      job: cancelledJob,
    });
  });

  it("releases a retryable failure back to queued and rethrows for BullMQ", async () => {
    const released: unknown[] = [];
    const runner = createGenerationJobRunner({
      repositories: {
        generationJobs: {
          findById: async () => null,
          acquireQueued: async () => ({ ...job, status: "running" }),
          renewLease: async () => true,
          releaseForRetry: async (_jobId, error) => {
            released.push(error);
            return { ...job, status: "queued", error };
          },
          fail: async () => {
            throw new Error("retryable failure should not be finalized");
          },
        },
      },
      processor: {
        process: async () => {
          throw new GenerationProcessingError(
            "ARTIFACT_STORAGE_ERROR",
            "MinIO unavailable",
            undefined,
            true,
          );
        },
      },
    });

    await expect(
      runner.processGenerationJobId("job_1", { canRetry: true }),
    ).rejects.toThrow("MinIO unavailable");
    expect(released).toEqual([
      {
        code: "ARTIFACT_STORAGE_ERROR",
        message: "MinIO unavailable",
        details: undefined,
        retryable: true,
      },
    ]);
  });

  it("marks the job failed with a typed processing error", async () => {
    const failed: unknown[] = [];
    const runner = createGenerationJobRunner({
      repositories: {
        generationJobs: {
          findById: async () => null,
          acquireQueued: async () => ({ ...job, status: "running" }),
          renewLease: async () => true,
          releaseForRetry: async () => {
            throw new Error("validation errors are not retryable");
          },
          fail: async (_jobId, error) => {
            failed.push(error);
            return { ...job, status: "failed", error };
          },
        },
      },
      processor: {
        process: async () => {
          throw new GenerationProcessingError("VALIDATION_ERROR", "Invalid DesignSpec", [
            { path: ["root"] },
          ]);
        },
      },
    });

    const result = await runner.processGenerationJobId("job_1");

    expect(result?.job.status).toBe("failed");
    expect(failed).toEqual([
      {
        code: "VALIDATION_ERROR",
        message: "Invalid DesignSpec",
        details: [{ path: ["root"] }],
        retryable: false,
      },
    ]);
  });
});

const job: GenerationJob = {
  id: "job_1",
  projectId: "proj_1",
  type: "generate_screen",
  status: "queued",
  prompt: "Create dashboard",
  deviceType: "desktop",
  mode: "fast",
  result: null,
  error: null,
  createdAt: "2026-06-18T12:00:00.000Z",
  updatedAt: "2026-06-18T12:00:00.000Z",
};

const screenVersion = {
  id: "ver_1",
  screenId: "screen_1",
  versionNumber: 1,
  sourcePrompt: "Create dashboard",
  operation: "generate" as const,
  designSpec: {
    schemaVersion: "1.0" as const,
    title: "Dashboard",
    deviceType: "desktop" as const,
    viewport: { width: 1440, height: 1024 },
    themeRefs: { designSystemId: null },
    root: {
      id: "root",
      type: "frame" as const,
      name: "Dashboard",
      layout: { position: "relative" as const, width: 1440, height: 1024 },
      style: {},
      content: {},
      children: [],
    },
    interactions: [],
    assets: [],
  },
  htmlCode: "<main>Dashboard</main>",
  reactCode: null,
  screenshotArtifactId: null,
  parentVersionId: null,
  createdAt: "2026-06-18T12:00:00.000Z",
};
