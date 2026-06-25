import { loadWorkerConfig } from "./config";
import { createGenerationWorkerRuntime } from "./index";

const config = loadWorkerConfig();
const worker = createGenerationWorkerRuntime(config);

worker.on("completed", (job) => {
  console.log(`Generation job ${job.id} completed`);
});
worker.on("failed", (job, error) => {
  console.error(`Generation job ${job?.id ?? "unknown"} failed`, error);
});

let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  await worker.close();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
console.log(`Open Design Canvas worker listening on queue ${config.queueName}`);
