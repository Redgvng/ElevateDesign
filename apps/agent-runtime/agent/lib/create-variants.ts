import type { DeviceType, GenerationJob } from "@odc/shared";
import { idempotencyKey, type IdempotencyContext } from "./idempotency";
import type { OdcApiClient } from "./odc-api-client";

export type CreateVariantsInput = {
  projectId: string;
  screenId: string;
  prompt: string;
  deviceType: DeviceType;
  count?: number;
};

export type CreateVariantsResult = {
  jobId: string;
  status: GenerationJob["status"];
  screenId: string | null;
  primaryVersionId: string | null;
  summary: string;
};

export type CreateVariantsOptions = {
  pollIntervalMs?: number;
  maxPolls?: number;
  sleep?: (ms: number) => Promise<void>;
};

const TERMINAL: ReadonlySet<GenerationJob["status"]> = new Set([
  "completed",
  "failed",
  "cancelled",
]);

export function clampVariantCount(count: number | undefined): number {
  if (typeof count !== "number" || Number.isNaN(count)) return 3;
  return Math.max(2, Math.min(4, Math.floor(count)));
}

/**
 * Idempotent orchestration tool: requests N parallel variants of a screen
 * through the backend variants pipeline (the backend persists sibling
 * ScreenVersions) and awaits a terminal status. Returns a bounded summary.
 */
export async function createVariants(
  client: OdcApiClient,
  input: CreateVariantsInput,
  context: IdempotencyContext,
  options: CreateVariantsOptions = {},
): Promise<CreateVariantsResult> {
  const { pollIntervalMs = 800, maxPolls = 90, sleep = defaultSleep } = options;
  const count = clampVariantCount(input.count);
  const key = idempotencyKey("create_variants", context);

  let job = await client.createGenerationJob(
    input.projectId,
    {
      type: "generate_variants",
      screenId: input.screenId,
      prompt: input.prompt,
      deviceType: input.deviceType,
      mode: "fast",
      count,
    },
    key,
  );

  let polls = 0;
  while (!TERMINAL.has(job.status) && polls < maxPolls) {
    await sleep(pollIntervalMs);
    job = await client.getGenerationJob(job.id);
    polls += 1;
  }

  return {
    jobId: job.id,
    status: job.status,
    screenId: job.result?.screenId ?? null,
    primaryVersionId: job.result?.screenVersionId ?? null,
    summary: `variants(${count}) job ${job.id} ${job.status}`,
  };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
