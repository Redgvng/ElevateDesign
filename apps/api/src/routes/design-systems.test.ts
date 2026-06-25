import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN_SYSTEM, type Project } from "@odc/shared";
import { createDesignSystemsRouter } from "./design-systems";
import { createInMemoryDesignSystemStore } from "../lib/design-system-store";
import type { ProjectStore } from "../lib/project-store";

const now = "2026-06-26T12:00:00.000Z";
const project: Project = {
  id: "proj_1",
  name: "Project",
  slug: "project",
  createdAt: now,
  updatedAt: now,
  defaultDesignSystemId: null,
};

const projectStore: ProjectStore = {
  createProject: async () => project,
  listProjects: async () => [project],
  getProject: async () => project,
  getCanvas: async () => null,
  updateCanvas: async () => null,
};

const validBody = {
  name: "Brand A",
  description: "Brand A system",
  tokens: DEFAULT_DESIGN_SYSTEM.tokens,
  designMarkdown: "Use bold headings.",
};

function postJson(body: unknown) {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("design system routes", () => {
  it("creates, lists, gets and updates a design system", async () => {
    const app = createDesignSystemsRouter(projectStore, createInMemoryDesignSystemStore());

    const created = await app.request("/api/projects/proj_1/design-systems", postJson(validBody));
    expect(created.status).toBe(201);
    const { designSystem } = await created.json();
    expect(designSystem.id).toMatch(/^ds_/);

    const list = await app.request("/api/projects/proj_1/design-systems");
    expect((await list.json()).designSystems).toHaveLength(1);

    const updated = await app.request(`/api/projects/proj_1/design-systems/${designSystem.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...validBody, name: "Renamed" }),
    });
    expect((await updated.json()).designSystem.name).toBe("Renamed");
  });

  it("rejects an invalid payload with 400", async () => {
    const app = createDesignSystemsRouter(projectStore, createInMemoryDesignSystemStore());
    const response = await app.request(
      "/api/projects/proj_1/design-systems",
      postJson({ name: "", description: "", tokens: {} }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 when the project is missing", async () => {
    const app = createDesignSystemsRouter(
      { ...projectStore, getProject: async () => null },
      createInMemoryDesignSystemStore(),
    );
    const response = await app.request("/api/projects/missing/design-systems");
    expect(response.status).toBe(404);
  });
});
