import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DESIGN_SYSTEM, type DesignSystem } from "@odc/shared";
import { DesignSystemPanel } from "./DesignSystemPanel";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("DesignSystemPanel", () => {
  let stored: DesignSystem[];
  let putBodies: string[];

  beforeEach(() => {
    stored = [];
    putBodies = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url === "/api/projects/proj_1/design-systems" && method === "GET") {
          return jsonResponse({ designSystems: stored });
        }
        if (url === "/api/projects/proj_1/design-systems" && method === "POST") {
          const created: DesignSystem = { ...DEFAULT_DESIGN_SYSTEM, id: "ds_1", name: "Design system 1" };
          stored = [created];
          return jsonResponse({ designSystem: created }, 201);
        }
        if (url === "/api/projects/proj_1/design-systems/ds_1" && method === "PUT") {
          putBodies.push(String(init?.body));
          return jsonResponse({ designSystem: { ...stored[0], designMarkdown: "Updated" } });
        }
        return jsonResponse({ error: { code: "NOT_FOUND", message: "Not found" } }, 404);
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("creates a design system from the default and saves edited guidance", async () => {
    const user = userEvent.setup();
    render(<DesignSystemPanel projectId="proj_1" />);

    await waitFor(() => expect(screen.getByText(/No design system yet/)).toBeTruthy());

    await user.click(screen.getByRole("button", { name: "Add" }));

    const textarea = await screen.findByLabelText("DESIGN.md guidance");
    await user.clear(textarea);
    await user.type(textarea, "Use generous spacing");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(putBodies).toHaveLength(1));
    expect(putBodies[0]).toContain("Use generous spacing");
  });
});
