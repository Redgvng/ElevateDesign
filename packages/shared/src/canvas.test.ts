import { describe, expect, it } from "vitest";
import { CanvasDocumentSchema, UpdateCanvasDocumentInputSchema } from "./canvas";

describe("canvas contracts", () => {
  it("validates a canvas document with a screen node and viewport", () => {
    const parsed = CanvasDocumentSchema.safeParse({
      id: "canvas_proj_000001",
      projectId: "proj_000001",
      schemaVersion: "1.0",
      nodes: [
        {
          id: "node_screen_000001",
          type: "screen",
          refId: "screen_000001",
          pinnedVersionId: "ver_000001",
          x: 120,
          y: 80,
          width: 360,
          height: 240,
          title: "Operations Dashboard",
          body: "Create a dense SaaS monitoring dashboard",
          screenshotArtifactId: "artifact_000001",
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      updatedAt: "2026-06-17T10:00:00.000Z",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.nodes[0].type).toBe("screen");
    expect(parsed.data.nodes[0].pinnedVersionId).toBe("ver_000001");
  });

  it("rejects canvas updates with invalid dimensions", () => {
    const parsed = UpdateCanvasDocumentInputSchema.safeParse({
      nodes: [
        {
          id: "node_screen_000001",
          type: "screen",
          refId: "screen_000001",
          x: 120,
          y: 80,
          width: 0,
          height: 240,
          title: "Operations Dashboard",
          body: null,
        },
      ],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    expect(parsed.success).toBe(false);
  });
});
