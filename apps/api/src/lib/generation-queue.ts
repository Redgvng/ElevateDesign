import type { GenerationQueue } from "./generation-store";

export function createNoopGenerationQueue(): GenerationQueue {
  return {
    async enqueueGenerationJob() {
      // Used in tests and local memory mode when Redis is not configured.
    },
    async removeGenerationJob() {
      return false;
    },
  };
}

export function createConfiguredGenerationQueue(redisUrl: string | undefined): GenerationQueue {
  if (!redisUrl) return createNoopGenerationQueue();

  let queue: Promise<GenerationQueue> | null = null;

  return {
    async enqueueGenerationJob(jobId) {
      queue ??= createBullMqGenerationQueue(redisUrl);
      await (await queue).enqueueGenerationJob(jobId);
    },
    async removeGenerationJob(jobId) {
      queue ??= createBullMqGenerationQueue(redisUrl);
      return (await queue).removeGenerationJob(jobId);
    },
  };
}

export async function createBullMqGenerationQueue(
  redisUrl: string,
  queueName = "generation",
): Promise<GenerationQueue> {
  const bullMq = (await dynamicImport("bullmq")) as {
    Queue: new (
      name: string,
      options: { connection: { url: string } },
    ) => {
      add: (
        name: string,
        data: Record<string, unknown>,
        options: Record<string, unknown>,
      ) => Promise<unknown>;
      getJob: (jobId: string) => Promise<{ remove: () => Promise<void> } | undefined>;
    };
  };
  const queue = new bullMq.Queue(queueName, {
    connection: { url: redisUrl },
  });

  return {
    async enqueueGenerationJob(jobId) {
      await queue.add(
        "generate",
        { jobId },
        {
          jobId,
          attempts: 3,
          backoff: { type: "exponential", delay: 1_000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
    },
    async removeGenerationJob(jobId) {
      const job = await queue.getJob(jobId);
      if (!job) return false;

      try {
        await job.remove();
        return true;
      } catch {
        // BullMQ cannot remove a locked/active job. PostgreSQL cancellation still wins.
        return false;
      }
    },
  };
}

function dynamicImport(packageName: string): Promise<unknown> {
  return new Function("packageName", "return import(packageName)")(packageName) as Promise<unknown>;
}
