import { z } from "zod";

const OptionalUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().url().optional(),
);

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

export const AppConfigSchema = z
  .object({
    nodeEnv: z.enum(["development", "test", "production"]),
    port: z.number().int().min(1).max(65_535),
    databaseUrl: OptionalUrlSchema,
    redisUrl: OptionalUrlSchema,
    objectStorage: z.object({
      endpoint: OptionalUrlSchema,
      healthcheckUrl: OptionalUrlSchema,
      region: z.string().min(1),
      bucket: z.string().min(1),
      accessKey: OptionalStringSchema,
      secretKey: OptionalStringSchema,
      forcePathStyle: z.boolean(),
    }),
    defaultWorkspace: z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    }),
    ai: z.object({
      provider: z.enum(["mock", "openai", "anthropic"]),
      openAiApiKey: OptionalStringSchema,
      openAiModel: OptionalStringSchema,
      anthropicApiKey: OptionalStringSchema,
      anthropicModel: OptionalStringSchema,
    }),
    corsOrigins: z.array(z.string().url()).min(1),
  })
  .superRefine((config, context) => {
    if (config.nodeEnv === "production") {
      for (const [path, value] of [
        ["databaseUrl", config.databaseUrl],
        ["redisUrl", config.redisUrl],
        ["objectStorage.endpoint", config.objectStorage.endpoint],
        ["objectStorage.healthcheckUrl", config.objectStorage.healthcheckUrl],
        ["objectStorage.accessKey", config.objectStorage.accessKey],
        ["objectStorage.secretKey", config.objectStorage.secretKey],
      ] as const) {
        if (!value) {
          context.addIssue({
            code: "custom",
            path: path.split("."),
            message: `${path} is required in production`,
          });
        }
      }
    }

    const hasAccessKey = Boolean(config.objectStorage.accessKey);
    const hasSecretKey = Boolean(config.objectStorage.secretKey);
    if (hasAccessKey !== hasSecretKey) {
      context.addIssue({
        code: "custom",
        path: ["objectStorage"],
        message: "Object storage access and secret keys must be configured together",
      });
    }

    if (config.ai.provider === "openai") {
      if (!config.ai.openAiApiKey) {
        context.addIssue({
          code: "custom",
          path: ["ai", "openAiApiKey"],
          message: "OPENAI_API_KEY is required when AI_PROVIDER=openai",
        });
      }
      if (!config.ai.openAiModel) {
        context.addIssue({
          code: "custom",
          path: ["ai", "openAiModel"],
          message: "OPENAI_MODEL is required when AI_PROVIDER=openai",
        });
      }
    }

    if (config.ai.provider === "anthropic") {
      if (!config.ai.anthropicApiKey) {
        context.addIssue({
          code: "custom",
          path: ["ai", "anthropicApiKey"],
          message: "ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic",
        });
      }
      if (!config.ai.anthropicModel) {
        context.addIssue({
          code: "custom",
          path: ["ai", "anthropicModel"],
          message: "ANTHROPIC_MODEL is required when AI_PROVIDER=anthropic",
        });
      }
    }
  });

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const corsOrigins = (environment.CORS_ORIGINS ??
    "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return AppConfigSchema.parse({
    nodeEnv: environment.NODE_ENV ?? "development",
    port: Number(environment.PORT ?? 3000),
    databaseUrl: environment.DATABASE_URL,
    redisUrl: environment.REDIS_URL,
    objectStorage: {
      endpoint: environment.OBJECT_STORAGE_ENDPOINT,
      healthcheckUrl: environment.OBJECT_STORAGE_HEALTHCHECK_URL,
      region: environment.OBJECT_STORAGE_REGION ?? "us-east-1",
      bucket: environment.OBJECT_STORAGE_BUCKET ?? "odc-artifacts",
      accessKey: environment.OBJECT_STORAGE_ACCESS_KEY,
      secretKey: environment.OBJECT_STORAGE_SECRET_KEY,
      forcePathStyle: BooleanFromEnvironmentSchema.parse(
        environment.OBJECT_STORAGE_FORCE_PATH_STYLE ?? "true",
      ),
    },
    defaultWorkspace: {
      id: environment.DEFAULT_WORKSPACE_ID ?? "ws_local",
      name: environment.DEFAULT_WORKSPACE_NAME ?? "Local Workspace",
      slug: environment.DEFAULT_WORKSPACE_SLUG ?? "local",
    },
    ai: {
      provider: environment.AI_PROVIDER ?? "mock",
      openAiApiKey: environment.OPENAI_API_KEY,
      openAiModel: environment.OPENAI_MODEL,
      anthropicApiKey: environment.ANTHROPIC_API_KEY,
      anthropicModel: environment.ANTHROPIC_MODEL,
    },
    corsOrigins,
  });
}
