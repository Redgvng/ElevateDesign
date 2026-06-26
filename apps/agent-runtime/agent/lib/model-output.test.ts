import { describe, expect, it } from "vitest";
import type { DesignSpec } from "@odc/shared";
import {
  boundedText,
  summarizeArtifact,
  summarizeDesignSpec,
  summarizeValidationIssues,
} from "./model-output";

const spec: DesignSpec = {
  schemaVersion: "1.0",
  title: "Operations Dashboard",
  deviceType: "desktop",
  viewport: { width: 1440, height: 1024 },
  themeRefs: { designSystemId: null },
  moduleRefs: ["dashboard.metric-overview", "data-display.table-with-filters"],
  root: {
    id: "root",
    type: "frame",
    name: "Dashboard",
    layout: { position: "relative", width: 1440, height: 1024 },
    style: {},
    content: {},
    children: [
      {
        id: "title",
        type: "text",
        name: "Title",
        layout: { position: "relative", width: "fill", height: "hug" },
        style: {},
        content: { text: "Hi" },
        children: [],
      },
    ],
  },
  interactions: [],
  assets: [],
};

describe("model-output summarizers", () => {
  it("bounds long text and leaves short text intact", () => {
    expect(boundedText("short", 100)).toBe("short");
    const long = "x".repeat(50);
    expect(boundedText(long, 10)).toBe(`${"x".repeat(10)}… (+40 chars)`);
  });

  it("summarizes a DesignSpec compactly with module refs and node count", () => {
    const summary = summarizeDesignSpec(spec);
    expect(summary).toContain('title="Operations Dashboard"');
    expect(summary).toContain("device=desktop");
    expect(summary).toContain("nodes=2");
    expect(summary).toContain("dashboard.metric-overview");
    expect(summary).not.toContain("schemaVersion");
  });

  it("summarizes validation issues and caps the list", () => {
    expect(summarizeValidationIssues([])).toBe("valid");
    const many = Array.from({ length: 10 }, (_, i) => ({ path: ["root", i], message: "bad" }));
    const summary = summarizeValidationIssues(many);
    expect(summary).toContain("10 issue(s)");
    expect(summary).toContain("+2 more");
  });

  it("summarizes artifacts by size without inlining content", () => {
    expect(summarizeArtifact({ kind: "html", byteSize: 2048 })).toBe("html 2.0KB");
    expect(summarizeArtifact({ kind: "screenshot", byteSize: 500, ref: "artifact_1" })).toBe(
      "screenshot 500B ref=artifact_1",
    );
  });
});
