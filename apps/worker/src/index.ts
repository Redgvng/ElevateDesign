import { createGenerationResultPersister, createPgGenerationRepositories } from "@odc/db";
import type { WorkerConfig } from "./config";
import { createBullMqGenerationWorker } from "./jobs/bullMqGenerationWorker";
import { createGenerationJobProcessor } from "./jobs/generationJobProcessor";
import { createGenerationJobRunner } from "./jobs/generationJobRunner";
import { MockAiProvider } from "./providers/MockAiProvider";
import { createS3ObjectStore } from "./storage/objectStore";

export * from "./config";
export * from "./providers/AiProvider";
export * from "./providers/MockAiProvider";
export * from "./compiler/designSpecToHtml";
export * from "./render/renderHtmlScreenshot";
export * from "./jobs/generationJobProcessor";
export * from "./jobs/generationJobRunner";
export * from "./jobs/bullMqGenerationWorker";
export * from "./storage/objectStore";
export * from "./modules/selectModules";

export function createGenerationWorkerRuntime(config: WorkerConfig) {
  const repositories = createPgGenerationRepositories(config.databaseUrl);
  const processor = createGenerationJobProcessor({
    provider: new MockAiProvider(),
    persister: createGenerationResultPersister(repositories.unitOfWork),
    artifactStore: createS3ObjectStore(config.objectStorage),
    providerName: config.ai.provider,
    model: config.ai.openAiModel ?? config.ai.anthropicModel ?? "mock-v1",
  });
  const runner = createGenerationJobRunner({
    repositories,
    processor,
    leaseDurationMs: config.jobLeaseMs,
    heartbeatIntervalMs: config.jobHeartbeatMs,
  });

  return createBullMqGenerationWorker({
    redisUrl: config.redisUrl,
    queueName: config.queueName,
    runner,
  });
}
