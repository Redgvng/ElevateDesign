import { z } from "zod";

const RequiredUrlSchema = z.string().url();
const OptionalStringSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional(),
);
const BooleanFromEnvironmentSchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return value;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return value;
}, z.boolean());

export const WorkerConfigSchema = z.object({
  databaseUrl: RequiredUrlSchema,
  redisUrl: RequiredUrlSchema,
  queueName: z.string().min(1).default("generation"),
  jobLeaseMs: z.number().int().min(5_000),
  jobHeartbeatMs: z.number().int().min(1_000),
  objectStorage: z.object({
    endpoint: RequiredUrlSchema,
    region: z.string().min(1),
    bucket: z.string().min(1),
    accessKey: z.string().min(1),
    secretKey: z.string().min(1),
    forcePathStyle: z.boolean(),
  }),
  ai: z.object({
    provider: z.enum(["mock", "openai", "anthropic"]).default("mock"),
    openAiApiKey: OptionalStringSchema,
    openAiModel: OptionalStringSchema,
    anthropicApiKey: OptionalStringSchema,
    anthropicModel: OptionalStringSchema,
  }),
});

export type WorkerConfig = z.infer<typeof WorkerConfigSchema>;

const ValidatedWorkerConfigSchema = WorkerConfigSchema.superRefine((config, context) => {
  if (config.jobHeartbeatMs >= config.jobLeaseMs) {
    context.addIssue({
      code: "custom",
      path: ["jobHeartbeatMs"],
      message: "GENERATION_JOB_HEARTBEAT_MS must be shorter than GENERATION_JOB_LEASE_MS",
    });
  }
});

export function loadWorkerConfig(environment: NodeJS.ProcessEnv = process.env): WorkerConfig {
  return ValidatedWorkerConfigSchema.parse({
    databaseUrl: environment.DATABASE_URL,
    redisUrl: environment.REDIS_URL,
    queueName: environment.GENERATION_QUEUE_NAME ?? "generation",
    jobLeaseMs: Number(environment.GENERATION_JOB_LEASE_MS ?? 120_000),
    jobHeartbeatMs: Number(environment.GENERATION_JOB_HEARTBEAT_MS ?? 30_000),
    objectStorage: {
      endpoint: environment.OBJECT_STORAGE_ENDPOINT,
      region: environment.OBJECT_STORAGE_REGION ?? "us-east-1",
      bucket: environment.OBJECT_STORAGE_BUCKET ?? "odc-artifacts",
      accessKey: environment.OBJECT_STORAGE_ACCESS_KEY,
      secretKey: environment.OBJECT_STORAGE_SECRET_KEY,
      forcePathStyle: BooleanFromEnvironmentSchema.parse(
        environment.OBJECT_STORAGE_FORCE_PATH_STYLE ?? "true",
      ),
    },
    ai: {
      provider: environment.AI_PROVIDER ?? "mock",
      openAiApiKey: environment.OPENAI_API_KEY,
      openAiModel: environment.OPENAI_MODEL,
      anthropicApiKey: environment.ANTHROPIC_API_KEY,
      anthropicModel: environment.ANTHROPIC_MODEL,
    },
  });
}
