import { describe, expect, it } from "vitest";
import type { DesignSpec } from "@odc/shared";
import { buildViteProjectFiles, viteProjectZipName } from "./viteProjectExport";

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
    children: [],
  },
  interactions: [],
  assets: [],
};

describe("buildViteProjectFiles", () => {
  it("produces a runnable Vite project skeleton", () => {
    const files = buildViteProjectFiles(spec);

    for (const path of [
      "package.json",
      "index.html",
      "vite.config.ts",
      "tailwind.config.js",
      "postcss.config.js",
      "src/index.css",
      "src/main.tsx",
      "src/Screen.tsx",
      "README.md",
    ]) {
      expect(files[path], path).toBeTruthy();
    }

    expect(files["package.json"]).toContain('"vite"');
    expect(files["src/main.tsx"]).toContain("createRoot");
    expect(files["src/Screen.tsx"]).toContain("export default function GeneratedScreen");
    expect(files["src/index.css"]).toContain("@tailwind");
    expect(files["README.md"]).toContain("npm run dev");
  });

  it("names the zip from the title", () => {
    expect(viteProjectZipName("Operations Dashboard")).toBe("operations-dashboard-vite.zip");
  });
});
