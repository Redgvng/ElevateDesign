import net from "node:net";
import tls from "node:tls";
import { Client } from "pg";
import type { AppConfig } from "../config";

export type ReadinessCheck = {
  status: "ok" | "skipped" | "error";
  latencyMs?: number;
  message?: string;
};

export type ReadinessReport = {
  ok: boolean;
  checks: {
    postgres: ReadinessCheck;
    redis: ReadinessCheck;
    objectStorage: ReadinessCheck;
  };
};

export async function checkReadiness(config: AppConfig): Promise<ReadinessReport> {
  const [postgres, redis, objectStorage] = await Promise.all([
    config.databaseUrl
      ? measure(() => pingPostgres(config.databaseUrl!))
      : Promise.resolve(skipped("DATABASE_URL is not configured")),
    config.redisUrl
      ? measure(() => pingRedis(config.redisUrl!))
      : Promise.resolve(skipped("REDIS_URL is not configured")),
    config.objectStorage.healthcheckUrl
      ? measure(() => pingHttp(config.objectStorage.healthcheckUrl!))
      : Promise.resolve(skipped("OBJECT_STORAGE_HEALTHCHECK_URL is not configured")),
  ]);

  const checks = { postgres, redis, objectStorage };
  return {
    ok: Object.values(checks).every((check) => check.status !== "error"),
    checks,
  };
}

async function pingPostgres(connectionString: string): Promise<void> {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 2_000,
    query_timeout: 2_000,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function pingRedis(connectionString: string): Promise<void> {
  const url = new URL(connectionString);
  const port = Number(url.port || (url.protocol === "rediss:" ? 6380 : 6379));
  const commands: string[][] = [];

  if (url.password) {
    commands.push(url.username ? ["AUTH", url.username, url.password] : ["AUTH", url.password]);
  }
  commands.push(["PING"]);

  await new Promise<void>((resolve, reject) => {
    const socket =
      url.protocol === "rediss:"
        ? tls.connect({ host: url.hostname, port, servername: url.hostname })
        : net.connect({ host: url.hostname, port });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Redis readiness check timed out"));
    }, 2_000);
    let buffer = "";
    let expectedResponses = commands.length;

    const cleanup = () => clearTimeout(timeout);

    socket.once("error", (error) => {
      cleanup();
      reject(error);
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const responses = buffer.split("\r\n").filter((line) => line.startsWith("+") || line.startsWith("-"));
      if (responses.some((line) => line.startsWith("-"))) {
        cleanup();
        socket.destroy();
        reject(new Error("Redis rejected the readiness command"));
        return;
      }

      if (responses.length >= expectedResponses && responses.at(-1) === "+PONG") {
        cleanup();
        socket.end();
        resolve();
      }
    });

    socket.once("connect", () => {
      for (const command of commands) {
        socket.write(encodeRedisCommand(command));
      }
    });
  });
}

async function pingHttp(url: string): Promise<void> {
  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(2_000),
  });

  if (!response.ok) {
    throw new Error(`Object storage healthcheck returned ${response.status}`);
  }
}

function encodeRedisCommand(parts: string[]): string {
  return `*${parts.length}\r\n${parts
    .map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`)
    .join("")}`;
}

async function measure(check: () => Promise<void>): Promise<ReadinessCheck> {
  const startedAt = performance.now();
  try {
    await check();
    return { status: "ok", latencyMs: Math.round(performance.now() - startedAt) };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Math.round(performance.now() - startedAt),
      message: error instanceof Error ? error.message : "Readiness check failed",
    };
  }
}

function skipped(message: string): ReadinessCheck {
  return { status: "skipped", message };
}
