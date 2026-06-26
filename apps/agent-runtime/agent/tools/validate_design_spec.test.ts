import { describe, expect, it } from "vitest";
import type { DesignSpec } from "@odc/shared";
import { validateDesignSpec } from "./validate_design_spec";

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

describe("validateDesignSpec", () => {
  it("accepts a valid spec and returns a compact summary", () => {
    const result = validateDesignSpec(validSpec);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.summary).toContain('title="Dashboard"');
      expect(result.designSpec.title).toBe("Dashboard");
    }
  });

  it("rejects an invalid spec with exact issues and a summary", () => {
    const result = validateDesignSpec({ ...validSpec, schemaVersion: "9.9" });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.summary).toContain("issue(s)");
    }
  });
});
