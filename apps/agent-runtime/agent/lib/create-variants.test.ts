import { describe, expect, it, vi } from "vitest";
import type { OdcApiClient } from "./odc-api-client";
import { clampVariantCount, createVariants } from "./create-variants";

describe("createVariants", () => {
  it("clamps the variant count to 2..4", () => {
    expect(clampVariantCount(undefined)).toBe(3);
    expect(clampVariantCount(1)).toBe(2);
    expect(clampVariantCount(9)).toBe(4);
    expect(clampVariantCount(3)).toBe(3);
  });

  it("creates a variants job, polls to completion, returns a bounded summary", async () => {
    const createGenerationJob = vi.fn(async () => ({ id: "job_1", status: "running" }));
    const getGenerationJob = vi
      .fn()
      .mockResolvedValueOnce({ id: "job_1", status: "running" })
      .mockResolvedValueOnce({
        id: "job_1",
        status: "completed",
        result: { screenId: "s1", screenVersionId: "v2" },
      });
    const client = { createGenerationJob, getGenerationJob } as unknown as OdcApiClient;

    const result = await createVariants(
      client,
      { projectId: "p1", screenId: "s1", prompt: "explore", deviceType: "desktop", count: 3 },
      { sessionId: "sess", turnId: "turn" },
      { sleep: async () => undefined },
    );

    expect(result.status).toBe("completed");
    expect(result.primaryVersionId).toBe("v2");
    expect(result.summary).toContain("variants(3)");
    const created = createGenerationJob.mock.calls[0] as unknown[];
    expect((created[1] as { type: string }).type).toBe("generate_variants");
    expect(created[2]).toMatch(/^eve_create_variants_/);
  });
});
