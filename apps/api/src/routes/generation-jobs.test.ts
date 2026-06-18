import { describe, expect, it } from "vitest";
import { createApp } from "../server";

describe("generation job routes", () => {
  it("creates and completes a generate_screen job with a screen version", async () => {
    const app = createApp({
      renderScreenshot: async () => ({
        bytes: Buffer.from("fake-png"),
        mimeType: "image/png",
        width: 1440,
        height: 1024,
      }),
    });
    const project = await createProject(app, "Generation Project");

    const response = await app.request(`/api/projects/${project.id}/generation-jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "generate_screen",
        prompt: "Create a dense SaaS monitoring dashboard",
        deviceType: "desktop",
        mode: "fast",
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.job).toMatchObject({
      id: expect.stringMatching(/^job_/),
      projectId: project.id,
      status: "completed",
      result: {
        screenId: expect.stringMatching(/^screen_/),
        screenVersionId: expect.stringMatching(/^ver_/),
      },
      error: null,
    });
    expect(body.screenVersion.htmlCode).toContain("Operations Dashboard");
    expect(body.screenVersion.designSpec.schemaVersion).toBe("1.0");
    expect(body.screenVersion.screenshotArtifactId).toMatch(/^artifact_/);

    const jobResponse = await app.request(`/api/generation-jobs/${body.job.id}`);
    expect(jobResponse.status).toBe(200);
    await expect(jobResponse.json()).resolves.toMatchObject({
      job: {
        id: body.job.id,
        status: "completed",
      },
    });
  });

  it("rejects invalid generation payloads", async () => {
    const app = createApp();
    const project = await createProject(app, "Validation Project");

    const response = await app.request(`/api/projects/${project.id}/generation-jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "generate_screen",
        prompt: "",
        deviceType: "desktop",
        mode: "fast",
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid generation job payload",
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
