import { describe, expect, it } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("provides deterministic local development defaults", () => {
    const config = loadConfig({});

    expect(config).toMatchObject({
      nodeEnv: "development",
      port: 3000,
      databaseUrl: undefined,
      redisUrl: undefined,
      defaultWorkspace: {
        id: "ws_local",
        name: "Local Workspace",
        slug: "local",
      },
      ai: {
        provider: "mock",
      },
    });
    expect(config.corsOrigins).toEqual([
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]);
  });

  it("rejects a production configuration without durable dependencies", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow();
  });

  it("accepts a complete production configuration", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      PORT: "8080",
      DATABASE_URL: "postgresql://odc:secret@db:5432/odc",
      REDIS_URL: "redis://redis:6379",
      OBJECT_STORAGE_ENDPOINT: "https://objects.example.com",
      OBJECT_STORAGE_HEALTHCHECK_URL: "https://objects.example.com/health",
      OBJECT_STORAGE_ACCESS_KEY: "access-key",
      OBJECT_STORAGE_SECRET_KEY: "secret-key",
      OBJECT_STORAGE_BUCKET: "odc-production",
      OBJECT_STORAGE_FORCE_PATH_STYLE: "false",
      AI_PROVIDER: "mock",
      CORS_ORIGINS: "https://app.example.com",
    });

    expect(config.port).toBe(8080);
    expect(config.objectStorage.forcePathStyle).toBe(false);
    expect(config.corsOrigins).toEqual(["https://app.example.com"]);
  });

  it("requires the matching provider credentials", () => {
    expect(() =>
      loadConfig({
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "test-key",
      }),
    ).toThrow(/OPENAI_MODEL/);
  });

  it("rejects partial object storage credentials", () => {
    expect(() =>
      loadConfig({
        OBJECT_STORAGE_ACCESS_KEY: "access-only",
      }),
    ).toThrow(/configured together/);
  });
});
