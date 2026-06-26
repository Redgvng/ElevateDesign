import { describe, expect, it } from "vitest";
import type { DesignSpec } from "@odc/shared";
import { compilePreview } from "./compile-preview";

const spec: DesignSpec = {
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

describe("compilePreview", () => {
  it("compiles a valid spec and reports a bounded summary", () => {
    const result = compilePreview(spec);
    expect(result.compiled).toBe(true);
    if (result.compiled) {
      expect(result.htmlCode).toContain("<!doctype html>");
      expect(result.byteSize).toBeGreaterThan(0);
      expect(result.summary).toContain("html");
      expect(result.summary).toContain('title="Dashboard"');
    }
  });

  it("refuses to compile an invalid spec", () => {
    const result = compilePreview({ schemaVersion: "broken" });
    expect(result.compiled).toBe(false);
    if (!result.compiled) expect(result.reason).toBe("invalid_spec");
  });
});
