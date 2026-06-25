import { Worker } from "bullmq";
import type { GenerationJobRunner } from "./generationJobRunner";

export type BullMqJobLike = {
  data: unknown;
  attemptsMade?: number;
  opts?: { attempts?: number };
};

export function createBullMqGenerationJobHandler(runner: GenerationJobRunner) {
  return async (job: BullMqJobLike) => {
    const jobId = parseGenerationQueueJobId(job.data);
    const attemptsMade = job.attemptsMade ?? 0;
    const maxAttempts = Math.max(1, job.opts?.attempts ?? 1);
    await runner.processGenerationJobId(jobId, {
      canRetry: attemptsMade + 1 < maxAttempts,
    });
  };
}

export function createBullMqGenerationWorker({
  redisUrl,
  queueName = "generation",
  runner,
}: {
  redisUrl: string;
  queueName?: string;
  runner: GenerationJobRunner;
}) {
  return new Worker(queueName, createBullMqGenerationJobHandler(runner), {
    connection: { url: redisUrl },
  });
}

function parseGenerationQueueJobId(data: unknown): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "jobId" in data &&
    typeof data.jobId === "string" &&
    data.jobId.length > 0
  ) {
    return data.jobId;
  }

  throw new Error("Invalid generation queue job: expected string jobId");
}
