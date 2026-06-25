import { serve } from "@hono/node-server";
import { loadConfig } from "./config";
import { createConfiguredGenerationQueue } from "./lib/generation-queue";
import { startGenerationQueueReconciler } from "./lib/generation-queue-reconciler";
import { createPgGenerationRepositories } from "./lib/pg-generation-repositories";
import { createApp } from "./server";

const config = loadConfig();
const generationQueue = createConfiguredGenerationQueue(config.redisUrl);
const generationRepositories = config.databaseUrl
  ? createPgGenerationRepositories(config.databaseUrl)
  : undefined;
const app = createApp({
  config,
  generationQueue,
  generationRepositories,
});
const reconciler =
  generationRepositories && config.redisUrl
    ? startGenerationQueueReconciler({
        generationJobs: generationRepositories.generationJobs,
        queue: generationQueue,
      })
    : null;
const server = serve({ fetch: app.fetch, port: config.port });

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  reconciler?.stop();
  server.close(() => process.exit(0));
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
console.log(`Open Design Canvas API listening on http://localhost:${config.port}`);
