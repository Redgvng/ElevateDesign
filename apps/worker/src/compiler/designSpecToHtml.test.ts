import { describe, expect, it } from "vitest";
import type { DesignSpec } from "@odc/shared";
import { designSpecToHtml } from "./designSpecToHtml";

describe("designSpecToHtml", () => {
  it("renders dashboard content from a DesignSpec", () => {
    const html = designSpecToHtml(createSpec("Operations Dashboard"));

    expect(html).toContain("<title>Operations Dashboard</title>");
    expect(html).toContain("Operations Dashboard");
    expect(html).toContain("odc-root");
  });

  it("escapes model-controlled text", () => {
    const html = designSpecToHtml(createSpec("<script>alert(1)</script>"));

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

function createSpec(title: string): DesignSpec {
  return {
    schemaVersion: "1.0",
    title,
    deviceType: "desktop",
    viewport: { width: 1440, height: 1024 },
    themeRefs: { designSystemId: null },
    root: {
      id: "root",
      type: "frame",
      name: "Root",
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
          content: { text: title },
          children: [],
        },
      ],
    },
    interactions: [],
    assets: [],
  };
}
