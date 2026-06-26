import { describe, expect, it } from "vitest";
import type { DesignSpec } from "@odc/shared";
import { designSpecToReact, reactDownloadName } from "./designSpecToReact";

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
        content: { text: 'Hello "World" {x}' },
        children: [],
      },
    ],
  },
  interactions: [],
  assets: [],
};

describe("designSpecToReact", () => {
  it("emits a default-exported component with Tailwind classes", () => {
    const code = designSpecToReact(spec);
    expect(code).toContain("export default function GeneratedScreen()");
    expect(code).toContain("<main className=");
    expect(code).toContain("bg-slate-50");
    expect(code).toContain('<h1 className="m-0 text-4xl font-bold');
  });

  it("escapes text content safely via JSON for JSX", () => {
    const code = designSpecToReact(spec);
    expect(code).toContain('{"Hello \\"World\\" {x}"}');
  });

  it("is deterministic", () => {
    expect(designSpecToReact(spec)).toBe(designSpecToReact(spec));
  });

  it("derives a safe .tsx filename", () => {
    expect(reactDownloadName("Operations Dashboard")).toBe("operations-dashboard.tsx");
    expect(reactDownloadName("###")).toBe("screen.tsx");
  });
});
