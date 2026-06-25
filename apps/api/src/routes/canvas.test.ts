import { describe, expect, it } from "vitest";
import { createApp } from "../server";

describe("canvas routes", () => {
  it("persists canvas node movement for a project", async () => {
    const app = createApp();
    const project = await createProject(app, "Canvas Project");

    const updateResponse = await app.request(`/api/projects/${project.id}/canvas`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        revision: 1,
        nodes: [
          {
            id: "node_screen_000001",
            type: "screen",
            refId: "screen_000001",
            pinnedVersionId: "ver_000001",
            x: 480,
            y: 240,
            width: 360,
            height: 240,
            title: "Operations Dashboard",
            body: null,
            screenshotArtifactId: null,
          },
        ],
        edges: [],
        viewport: { x: -120, y: -60, zoom: 0.85 },
      }),
    });

    expect(updateResponse.status).toBe(200);
    await expect(updateResponse.json()).resolves.toMatchObject({
      canvas: {
        projectId: project.id,
        revision: 2,
        nodes: [{ id: "node_screen_000001", x: 480, y: 240 }],
        viewport: { x: -120, y: -60, zoom: 0.85 },
      },
    });

    const getResponse = await app.request(`/api/projects/${project.id}/canvas`);
    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toMatchObject({
      canvas: {
        nodes: [{ id: "node_screen_000001", x: 480, y: 240 }],
      },
    });
  });

  it("rejects an outdated revision with the current canvas", async () => {
    const app = createApp();
    const project = await createProject(app, "Canvas Conflict Project");
    const firstUpdate = await app.request(`/api/projects/${project.id}/canvas`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        revision: 1,
        nodes: [],
        edges: [],
        viewport: { x: 10, y: 20, zoom: 1 },
      }),
    });
    expect(firstUpdate.status).toBe(200);

    const staleUpdate = await app.request(`/api/projects/${project.id}/canvas`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        revision: 1,
        nodes: [],
        edges: [],
        viewport: { x: 999, y: 999, zoom: 1 },
      }),
    });

    expect(staleUpdate.status).toBe(409);
    await expect(staleUpdate.json()).resolves.toMatchObject({
      error: {
        code: "CANVAS_CONFLICT",
        message: "Canvas changed since it was loaded",
      },
      canvas: {
        revision: 2,
        viewport: { x: 10, y: 20, zoom: 1 },
      },
    });
  });

  it("rejects invalid canvas updates", async () => {
    const app = createApp();
    const project = await createProject(app, "Invalid Canvas Project");

    const response = await app.request(`/api/projects/${project.id}/canvas`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        revision: 1,
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 0 },
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid canvas payload",
      },
    });
  });

  it("returns not found when updating a missing project canvas", async () => {
    const app = createApp();

    const response = await app.request("/api/projects/proj_missing/canvas", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        revision: 1,
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "Project not found",
      },
    });
  });
});

async function createProject(app: ReturnType<typeof createApp>, name: string) {
  const response = await app.request("/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const body = await response.json();
  return body.project;
}
