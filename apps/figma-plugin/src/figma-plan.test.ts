import { describe, expect, it } from "vitest";
import type { DesignSpec } from "@odc/shared";
import { designSpecToFigmaPlan } from "./figma-plan";

const spec: DesignSpec = {
  schemaVersion: "1.0",
  title: "Operations Dashboard",
  deviceType: "desktop",
  viewport: { width: 1440, height: 1024 },
  themeRefs: { designSystemId: null },
  root: {
    id: "root",
    type: "frame",
    name: "Dashboard",
    layout: { position: "relative", width: 1440, height: 1024, direction: "column", gap: 24 },
    style: {},
    content: {},
    children: [
      {
        id: "title",
        type: "text",
        name: "Title",
        layout: { position: "relative", width: "fill", height: "hug" },
        style: {},
        content: { text: "Hello" },
        children: [],
      },
    ],
  },
  interactions: [],
  assets: [],
};

describe("designSpecToFigmaPlan", () => {
  it("maps the spec to a Figma import plan preserving structure", () => {
    const plan = designSpecToFigmaPlan(spec);

    expect(plan.title).toBe("Operations Dashboard");
    expect(plan.width).toBe(1440);
    expect(plan.root.kind).toBe("frame");
    expect(plan.root.direction).toBe("column");
    expect(plan.root.gap).toBe(24);
    expect(plan.root.children).toHaveLength(1);
    expect(plan.root.children[0]).toMatchObject({ kind: "text", text: "Hello", width: "fill" });
  });

  it("is deterministic", () => {
    expect(designSpecToFigmaPlan(spec)).toEqual(designSpecToFigmaPlan(spec));
  });
});
