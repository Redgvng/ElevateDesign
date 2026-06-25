import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScreenVersion } from "@odc/shared";
import { PreviewPanel, artifactContentUrl, htmlDownloadName } from "./PreviewPanel";

afterEach(() => cleanup());

describe("PreviewPanel", () => {
  it("keeps live HTML as the default and switches to the persisted screenshot", async () => {
    const user = userEvent.setup();
    render(<PreviewPanel job={null} screenVersion={screenVersion} />);

    expect(screen.getByTitle("Generated screen preview")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Live HTML" }).getAttribute("aria-pressed")).toBe(
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Snapshot" }));

    const image = screen.getByRole("img", { name: "Operations Dashboard generated screenshot" });
    expect(image.getAttribute("src")).toBe(
      "/api/artifacts/artifact_1%2Funsafe/content",
    );
    expect(screen.queryByTitle("Generated screen preview")).toBeNull();
  });

  it("does not expose snapshot controls without an artifact", () => {
    render(
      <PreviewPanel
        job={null}
        screenVersion={{ ...screenVersion, screenshotArtifactId: null }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Snapshot" })).toBeNull();
    expect(screen.getByTitle("Generated screen preview")).toBeTruthy();
  });

  it("encodes artifact ids in content URLs", () => {
    expect(artifactContentUrl("artifact with/slash")).toBe(
      "/api/artifacts/artifact%20with%2Fslash/content",
    );
  });

  it("derives a safe html download filename from the title", () => {
    expect(htmlDownloadName("Operations Dashboard")).toBe("operations-dashboard.html");
    expect(htmlDownloadName("  !!! ")).toBe("screen.html");
  });

  it("downloads the standalone HTML when Export HTML is clicked", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<PreviewPanel job={null} screenVersion={screenVersion} />);
    await user.click(screen.getByRole("button", { name: "Export HTML" }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});

const screenVersion: ScreenVersion = {
  id: "ver_1",
  screenId: "screen_1",
  versionNumber: 1,
  sourcePrompt: "Create a dashboard",
  operation: "generate",
  designSpec: {
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
  },
  htmlCode: "<main>Operations Dashboard</main>",
  reactCode: null,
  screenshotArtifactId: "artifact_1/unsafe",
  parentVersionId: null,
  createdAt: "2026-06-18T10:00:00.000Z",
};
