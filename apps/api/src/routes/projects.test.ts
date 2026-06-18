import { describe, expect, it } from "vitest";
import { createApp } from "../server";

describe("project routes", () => {
  it("creates a project with a slug and empty canvas document", async () => {
    const app = createApp();

    const response = await app.request("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "My Product" }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.project).toMatchObject({
      name: "My Product",
      slug: "my-product",
      defaultDesignSystemId: null,
    });
    expect(body.project.id).toMatch(/^proj_/);
    expect(body.project.createdAt).toEqual(expect.any(String));

    const canvasResponse = await app.request(`/api/projects/${body.project.id}/canvas`);
    expect(canvasResponse.status).toBe(200);
    await expect(canvasResponse.json()).resolves.toMatchObject({
      canvas: {
        id: `canvas_${body.project.id}`,
        projectId: body.project.id,
        schemaVersion: "1.0",
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    });
  });

  it("reuses the original project when an idempotency key is repeated", async () => {
    const app = createApp();
    const body = JSON.stringify({ name: "Retry Safe Project" });

    const first = await app.request("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "create-project-1" },
      body,
    });
    const second = await app.request("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "create-project-1" },
      body,
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(secondBody.project.id).toBe(firstBody.project.id);

    const list = await app.request("/api/projects");
    const listBody = await list.json();
    expect(listBody.projects).toHaveLength(1);
  });

  it("rejects an idempotency key reused with another payload", async () => {
    const app = createApp();

    const first = await app.request("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "create-project-conflict" },
      body: JSON.stringify({ name: "Original Project" }),
    });
    const second = await app.request("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "create-project-conflict" },
      body: JSON.stringify({ name: "Different Project" }),
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    await expect(second.json()).resolves.toMatchObject({
      error: {
        code: "IDEMPOTENCY_CONFLICT",
      },
    });
  });

  it("lists projects in newest-first order", async () => {
    const app = createApp();

    await app.request("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "First Project" }),
    });
    await app.request("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Second Project" }),
    });

    const response = await app.request("/api/projects");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.projects.map((project: { name: string }) => project.name)).toEqual([
      "Second Project",
      "First Project",
    ]);
  });

  it("returns validation error for an empty project name", async () => {
    const app = createApp();

    const response = await app.request("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid project payload",
      },
    });
  });

  it("returns not found for unknown projects", async () => {
    const app = createApp();

    const response = await app.request("/api/projects/proj_missing");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "Project not found",
      },
    });
  });
});
