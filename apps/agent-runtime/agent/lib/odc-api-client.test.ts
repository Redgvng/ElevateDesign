import { describe, expect, it, vi } from "vitest";
import { createOdcApiClient, OdcApiError, type FetchLike } from "./odc-api-client";

function ok(body: unknown): ReturnType<FetchLike> {
  return Promise.resolve({ ok: true, status: 200, json: async () => body });
}

describe("createOdcApiClient", () => {
  it("aggregates project, screens and design systems into a context", async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith("/api/projects/p1")) return ok({ project: { id: "p1", name: "P" } });
      if (url.endsWith("/api/projects/p1/screens")) return ok({ screens: [{ screen: { id: "s1" } }] });
      if (url.endsWith("/api/projects/p1/design-systems")) return ok({ designSystems: [{ id: "ds1" }] });
      return ok({});
    }) as unknown as FetchLike;

    const client = createOdcApiClient({ baseUrl: "http://x/", fetch });
    const context = await client.getProjectContext("p1");

    expect(context.project.id).toBe("p1");
    expect(context.screens).toHaveLength(1);
    expect(context.designSystems[0].id).toBe("ds1");
  });

  it("sends the idempotency-key header on generation job creation", async () => {
    const fetch = vi.fn(async () => ok({ job: { id: "job_1" } })) as unknown as FetchLike;
    const client = createOdcApiClient({ baseUrl: "http://x", fetch });

    await client.createGenerationJob(
      "p1",
      { type: "generate_screen", prompt: "x", deviceType: "desktop", mode: "fast" },
      "eve_key_123",
    );

    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("http://x/api/projects/p1/generation-jobs");
    expect(call[1].method).toBe("POST");
    expect(call[1].headers["idempotency-key"]).toBe("eve_key_123");
  });

  it("throws a typed OdcApiError with the backend code on failure", async () => {
    const fetch = vi.fn(async () =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({ error: { code: "NOT_FOUND", message: "missing" } }),
      }),
    ) as unknown as FetchLike;
    const client = createOdcApiClient({ baseUrl: "http://x", fetch });

    await expect(client.getGenerationJob("nope")).rejects.toMatchObject({
      name: "OdcApiError",
      status: 404,
      code: "NOT_FOUND",
    });
    expect(OdcApiError).toBeTruthy();
  });
});
