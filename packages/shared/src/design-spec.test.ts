import { describe, expect, it } from "vitest";
import { DesignSpecSchema } from "./design-spec";

describe("DesignSpecSchema", () => {
  it("accepts a valid desktop DesignSpec", () => {
    const result = DesignSpecSchema.safeParse({
      schemaVersion: "1.0",
      title: "Operations Dashboard",
      deviceType: "desktop",
      viewport: { width: 1440, height: 1024 },
      themeRefs: { designSystemId: null },
      root: {
        id: "root",
        type: "frame",
        name: "Dashboard",
        layout: { position: "relative", width: 1440, height: 1024 },
        style: { background: "#f8fafc" },
        content: {},
        children: [
          {
            id: "title",
            type: "text",
            name: "Title",
            layout: { position: "relative", width: "fill", height: "hug" },
            style: { typography: { fontSize: 32, fontWeight: 700, lineHeight: 1.1 } },
            content: { text: "Operations Dashboard" },
            children: [],
          },
        ],
      },
      interactions: [],
      assets: [],
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported node types with a useful path", () => {
    const result = DesignSpecSchema.safeParse({
      schemaVersion: "1.0",
      title: "Broken",
      deviceType: "desktop",
      viewport: { width: 1440, height: 1024 },
      themeRefs: { designSystemId: null },
      root: {
        id: "root",
        type: "iframe",
        name: "Unsafe",
        layout: { position: "relative", width: 1440, height: 1024 },
        style: {},
        content: {},
        children: [],
      },
      interactions: [],
      assets: [],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["root", "type"]);
  });
});
