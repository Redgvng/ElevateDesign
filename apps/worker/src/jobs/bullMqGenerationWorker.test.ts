import { describe, expect, it } from "vitest";
import { createBullMqGenerationJobHandler } from "./bullMqGenerationWorker";

describe("createBullMqGenerationJobHandler", () => {
  it("delegates a valid BullMQ job id with retry availability", async () => {
    const processed: Array<{ jobId: string; canRetry: boolean | undefined }> = [];
    const handler = createBullMqGenerationJobHandler({
      processGenerationJobId: async (jobId, options) => {
        processed.push({ jobId, canRetry: options?.canRetry });
        return null;
      },
    });

    await handler({ data: { jobId: "job_1" }, attemptsMade: 0, opts: { attempts: 3 } });
    await handler({ data: { jobId: "job_1" }, attemptsMade: 2, opts: { attempts: 3 } });

    expect(processed).toEqual([
      { jobId: "job_1", canRetry: true },
      { jobId: "job_1", canRetry: false },
    ]);
  });

  it("rejects jobs without a stable string jobId", async () => {
    const handler = createBullMqGenerationJobHandler({
      processGenerationJobId: async () => {
        throw new Error("should not process invalid queue data");
      },
    });

    await expect(handler({ data: { jobId: 123 } })).rejects.toThrow("Invalid generation queue job");
  });
});
