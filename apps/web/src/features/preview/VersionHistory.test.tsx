import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenVersion, ScreenVersionSummary } from "@odc/shared";
import { VersionHistory } from "./VersionHistory";

const summaries: ScreenVersionSummary[] = [
  {
    id: "ver_2",
    screenId: "screen_1",
    versionNumber: 2,
    operation: "edit",
    screenshotArtifactId: null,
    parentVersionId: "ver_1",
    createdAt: "2026-06-18T10:05:00.000Z",
  },
  {
    id: "ver_1",
    screenId: "screen_1",
    versionNumber: 1,
    operation: "generate",
    screenshotArtifactId: null,
    parentVersionId: null,
    createdAt: "2026-06-18T10:00:00.000Z",
  },
];

const restoredVersion: ScreenVersion = {
  id: "ver_1",
  screenId: "screen_1",
  versionNumber: 1,
  sourcePrompt: "Create a dashboard",
  operation: "generate",
  designSpec: {
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
  },
  htmlCode: "<main>Dashboard</main>",
  reactCode: null,
  screenshotArtifactId: null,
  parentVersionId: null,
  createdAt: "2026-06-18T10:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("VersionHistory", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/screens/screen_1/versions" && (!init || init.method === undefined)) {
          return jsonResponse({ versions: summaries });
        }
        if (url === "/api/screens/screen_1/current-version" && init?.method === "PUT") {
          return jsonResponse({ screen: {}, currentVersion: summaries[1] });
        }
        if (url === "/api/screen-versions/ver_1" && (!init || init.method === undefined)) {
          return jsonResponse({ screenVersion: restoredVersion });
        }
        return jsonResponse({ error: { code: "NOT_FOUND", message: "Not found" } }, 404);
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lists versions, marks the active one, and reverts on Restore", async () => {
    const user = userEvent.setup();
    const onRevert = vi.fn();

    render(<VersionHistory screenId="screen_1" activeVersionId="ver_2" onRevert={onRevert} />);

    await waitFor(() => expect(screen.getByText("v2 · edit")).toBeTruthy());
    expect(screen.getByText("Current")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(onRevert).toHaveBeenCalledWith(restoredVersion));
    expect(fetch).toHaveBeenCalledWith(
      "/api/screens/screen_1/current-version",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("renders nothing for a single-version screen", async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      jsonResponse({ versions: [summaries[1]] }),
    );

    const { container } = render(
      <VersionHistory screenId="screen_1" activeVersionId="ver_1" onRevert={vi.fn()} />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container.querySelector(".version-history")).toBeNull();
  });
});
