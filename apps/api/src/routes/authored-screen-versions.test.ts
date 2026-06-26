import { describe, expect, it, vi } from "vitest";
import type { DesignSpec, Project } from "@odc/shared";
import {
  createAuthoredScreenVersionsRouter,
  type AuthoredScreenVersionPersister,
} from "./authored-screen-versions";
import type { ProjectStore } from "../lib/project-store";

const now = "2026-06-26T12:00:00.000Z";
const project: Project = {
  id: "p1",
  name: "P",
  slug: "p",
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

const validSpec: DesignSpec = {
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
};

function persisterWith(spy: ReturnType<typeof vi.fn>): AuthoredScreenVersionPersister {
  return { persistAuthoredScreenVersion: spy } as unknown as AuthoredScreenVersionPersister;
}

describe("authored screen versions route", () => {
  it("compiles HTML and persists an authored spec", async () => {
    const spy = vi.fn(async (_input: { projectId: string; htmlCode: string; provider: string }) => ({
      screen: { id: "screen_1" },
      screenVersion: { id: "ver_1", versionNumber: 1 },
    }));
    const app = createAuthoredScreenVersionsRouter(projectStore, persisterWith(spy));

    const response = await app.request("/api/projects/p1/screen-versions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ designSpec: validSpec, sourcePrompt: "Make a dashboard" }),
    });

    expect(response.status).toBe(201);
    const call = spy.mock.calls[0]![0];
    expect(call.projectId).toBe("p1");
    expect(call.htmlCode).toContain("<!doctype html>");
    expect(call.provider).toBe("eve");
  });

  it("rejects an invalid design spec with 400", async () => {
    const spy = vi.fn();
    const app = createAuthoredScreenVersionsRouter(projectStore, persisterWith(spy));

    const response = await app.request("/api/projects/p1/screen-versions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ designSpec: { schemaVersion: "broken" }, sourcePrompt: "x" }),
    });

    expect(response.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 404 when the project is missing", async () => {
    const app = createAuthoredScreenVersionsRouter(
      { ...projectStore, getProject: async () => null },
      persisterWith(vi.fn()),
    );

    const response = await app.request("/api/projects/missing/screen-versions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ designSpec: validSpec, sourcePrompt: "x" }),
    });

    expect(response.status).toBe(404);
  });
});
