import { describe, expect, it } from "vitest";
import { loadWorkerConfig } from "./config";

describe("loadWorkerConfig", () => {
  it("loads required database and redis URLs", () => {
    expect(
      loadWorkerConfig({
        DATABASE_URL: "postgresql://odc:odc@localhost:5432/odc",
        REDIS_URL: "redis://localhost:6379",
        OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
        OBJECT_STORAGE_ACCESS_KEY: "odc_minio",
        OBJECT_STORAGE_SECRET_KEY: "odc_minio_password",
        AI_PROVIDER: "mock",
      }),
    ).toMatchObject({
      databaseUrl: "postgresql://odc:odc@localhost:5432/odc",
      redisUrl: "redis://localhost:6379",
      queueName: "generation",
      jobLeaseMs: 120_000,
      jobHeartbeatMs: 30_000,
      objectStorage: {
        endpoint: "http://localhost:9000",
        region: "us-east-1",
        bucket: "odc-artifacts",
        accessKey: "odc_minio",
        secretKey: "odc_minio_password",
        forcePathStyle: true,
      },
      ai: { provider: "mock" },
    });
  });

  it("rejects a heartbeat that cannot renew before lease expiry", () => {
    expect(() =>
      loadWorkerConfig({
        DATABASE_URL: "postgresql://odc:odc@localhost:5432/odc",
        REDIS_URL: "redis://localhost:6379",
        OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
        OBJECT_STORAGE_ACCESS_KEY: "odc_minio",
        OBJECT_STORAGE_SECRET_KEY: "odc_minio_password",
        GENERATION_JOB_LEASE_MS: "10000",
        GENERATION_JOB_HEARTBEAT_MS: "10000",
      }),
    ).toThrow(/must be shorter/);
  });

  it("rejects missing queue infrastructure", () => {
    expect(() =>
      loadWorkerConfig({
        DATABASE_URL: "postgresql://odc:odc@localhost:5432/odc",
      }),
    ).toThrow();
  });
});
