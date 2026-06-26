import { describe, expect, it, vi } from "vitest";
import type { DesignSpec } from "@odc/shared";
import type { OdcApiClient } from "../lib/odc-api-client";
import { createScreenVersion } from "./create_screen_version";

const validSpec: DesignSpec = {
  schemaVersion: "1.0",
  title: "Dashboard",
  deviceType: "desktop",
  viewport: { width: 1440, height: 1024 },
  themeRefs: { designSystemId: null },
  root: {
    id: "root",
    type: "frame",
    name: "Dashboard",
    layout: { position: "relative", width: 1440, height: 1024 },
    style: {},
    content: {},
    children: [],
  },
  interactions: [],
  assets: [],
};

const context = { sessionId: "s1", turnId: "t1" };

describe("createScreenVersion tool", () => {
  it("validates then persists a valid spec with an idempotency key", async () => {
    const createScreenVersionFn = vi.fn(async () => ({
      screen: { id: "screen_1" },
      screenVersion: { id: "ver_1", versionNumber: 1, operation: "generate" },
    }));
    const client = { createScreenVersion: createScreenVersionFn } as unknown as OdcApiClient;

    const result = await createScreenVersion(
      client,
      { projectId: "p1", designSpec: validSpec, sourcePrompt: "Make a dashboard" },
      context,
    );

    expect(result.created).toBe(true);
    if (result.created) {
      expect(result.screenVersionId).toBe("ver_1");
      expect(result.summary).toContain("version 1");
    }
    const call = createScreenVersionFn.mock.calls[0] as unknown[];
    expect(call[0]).toBe("p1");
    expect(call[2]).toMatch(/^eve_create_screen_version_/);
  });

  it("refuses to persist an invalid spec and never calls the backend", async () => {
    const createScreenVersionFn = vi.fn();
    const client = { createScreenVersion: createScreenVersionFn } as unknown as OdcApiClient;

    const result = await createScreenVersion(
      client,
      { projectId: "p1", designSpec: { schemaVersion: "broken" }, sourcePrompt: "x" },
      context,
    );

    expect(result.created).toBe(false);
    if (!result.created) expect(result.reason).toBe("invalid_spec");
    expect(createScreenVersionFn).not.toHaveBeenCalled();
  });
});
