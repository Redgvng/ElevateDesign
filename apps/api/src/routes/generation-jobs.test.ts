import { describe, expect, it } from "vitest";
import { createApp } from "../server";

describe("generation job routes", () => {
  it("creates a queued generate_screen job without waiting for generation", async () => {
    const enqueuedJobIds: string[] = [];
    const app = createApp({
      generationQueue: {
        enqueueGenerationJob: async (jobId) => {
          enqueuedJobIds.push(jobId);
        },
        removeGenerationJob: async () => false,
      },
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

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.job).toMatchObject({
      id: expect.stringMatching(/^job_/),
      projectId: project.id,
      status: "queued",
      result: null,
      error: null,
    });
    expect(body.screenVersion).toBeUndefined();
    expect(enqueuedJobIds).toEqual([body.job.id]);

    const jobResponse = await app.request(`/api/generation-jobs/${body.job.id}`);
    expect(jobResponse.status).toBe(200);
    await expect(jobResponse.json()).resolves.toMatchObject({
      job: {
        id: body.job.id,
        status: "queued",
      },
    });
  });

  it("cancels a queued job and removes it from BullMQ", async () => {
    const removedJobIds: string[] = [];
    const app = createApp({
      generationQueue: {
        enqueueGenerationJob: async () => undefined,
        removeGenerationJob: async (jobId) => {
          removedJobIds.push(jobId);
          return true;
        },
      },
    });
    const project = await createProject(app, "Cancellation Project");
    const createdResponse = await app.request(`/api/projects/${project.id}/generation-jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "generate_screen",
        prompt: "Create a cancellable dashboard",
        deviceType: "desktop",
        mode: "fast",
      }),
    });
    const created = await createdResponse.json();

    const response = await app.request(`/api/generation-jobs/${created.job.id}/cancel`, {
      method: "POST",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      job: { id: created.job.id, status: "cancelled" },
    });
    expect(removedJobIds).toEqual([created.job.id]);

    const repeated = await app.request(`/api/generation-jobs/${created.job.id}/cancel`, {
      method: "POST",
    });
    expect(repeated.status).toBe(200);
    expect(removedJobIds).toEqual([created.job.id]);
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
