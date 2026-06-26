import { describe, expect, it, vi } from "vitest";
import type { OdcApiClient } from "./odc-api-client";
import { prepareExport } from "./prepare-export";

describe("prepareExport", () => {
  it("resolves the version and builds a filename plan per format", async () => {
    const getScreenVersion = vi.fn(async () => ({
      versionNumber: 2,
      designSpec: { title: "Operations Dashboard" },
    }));
    const client = { getScreenVersion } as unknown as OdcApiClient;

    const result = await prepareExport(client, "ver_1");

    expect(result.title).toBe("Operations Dashboard");
    expect(result.artifacts).toEqual([
      { format: "html", filename: "operations-dashboard.html" },
      { format: "react", filename: "operations-dashboard.tsx" },
      { format: "vite-zip", filename: "operations-dashboard-vite.zip" },
    ]);
    expect(result.summary).toContain('v2');
  });

  it("honors a restricted format list", async () => {
    const client = {
      getScreenVersion: async () => ({ versionNumber: 1, designSpec: { title: "X" } }),
    } as unknown as OdcApiClient;

    const result = await prepareExport(client, "ver_1", ["html"]);
    expect(result.artifacts).toEqual([{ format: "html", filename: "x.html" }]);
  });
});
