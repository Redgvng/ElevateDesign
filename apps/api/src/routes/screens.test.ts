import { describe, expect, it } from "vitest";
import type { GenerationRepositories } from "@odc/db";
import type { Project, Screen, ScreenVersion } from "@odc/shared";
import { createScreensRouter } from "./screens";
import type { ProjectStore } from "../lib/project-store";

describe("screen routes", () => {
  it("lists project screens with current version summaries only", async () => {
    const app = createScreensRouter(projectStore, repositories);

    const response = await app.request(`/api/projects/${project.id}/screens`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      screens: [
        {
          screen,
          currentVersion: {
            id: screenVersion.id,
            screenId: screen.id,
            versionNumber: 1,
            operation: "generate",
            screenshotArtifactId: null,
            parentVersionId: null,
            createdAt: screenVersion.createdAt,
          },
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("htmlCode");
  });

  it("returns a full screen version for preview hydration", async () => {
    const app = createScreensRouter(projectStore, repositories);

    const response = await app.request(`/api/screen-versions/${screenVersion.id}`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ screenVersion });
  });

  it("reverts the current version to an existing version of the same screen", async () => {
    const olderVersion: ScreenVersion = { ...screenVersion, id: "ver_0", versionNumber: 1 };
    const app = createScreensRouter(projectStore, {
      ...repositories,
      screenVersions: { ...repositories.screenVersions, findById: async () => olderVersion },
    });

    const response = await app.request(`/api/screens/${screen.id}/current-version`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screenVersionId: "ver_0" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.screen.currentVersionId).toBe("ver_0");
  });

  it("rejects reverting to a version that belongs to another screen", async () => {
    const foreignVersion: ScreenVersion = { ...screenVersion, id: "ver_x", screenId: "screen_other" };
    const app = createScreensRouter(projectStore, {
      ...repositories,
      screenVersions: { ...repositories.screenVersions, findById: async () => foreignVersion },
    });

    const response = await app.request(`/api/screens/${screen.id}/current-version`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screenVersionId: "ver_x" }),
    });

    expect(response.status).toBe(404);
  });

  it("validates that screenVersionId is provided", async () => {
    const app = createScreensRouter(projectStore, repositories);

    const response = await app.request(`/api/screens/${screen.id}/current-version`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when project is missing", async () => {
    const app = createScreensRouter(
      { ...projectStore, getProject: async () => null },
      repositories,
    );

    const response = await app.request("/api/projects/missing/screens");

    expect(response.status).toBe(404);
  });
});

const now = "2026-06-18T12:00:00.000Z";

const project: Project = {
  id: "proj_1",
  name: "Project",
  slug: "project",
  createdAt: now,
  updatedAt: now,
  defaultDesignSystemId: null,
};

const screen: Screen = {
  id: "screen_1",
  projectId: project.id,
  title: "Dashboard",
  deviceType: "desktop",
  currentVersionId: "ver_1",
  createdAt: now,
  updatedAt: now,
};

const screenVersion: ScreenVersion = {
  id: "ver_1",
  screenId: screen.id,
  versionNumber: 1,
  sourcePrompt: "Create dashboard",
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
  createdAt: now,
};

const projectStore: ProjectStore = {
  createProject: async () => project,
  listProjects: async () => [project],
  getProject: async () => project,
  getCanvas: async () => null,
  updateCanvas: async () => null,
};

const repositories: GenerationRepositories = {
  generationJobs: {
    createQueued: async () => {
      throw new Error("not used");
    },
    findById: async () => null,
    findByIdForUpdate: async () => null,
    listQueued: async () => [],
    acquireQueued: async () => null,
    renewLease: async () => false,
    requeueExpiredRunning: async () => [],
    cancel: async () => null,
    releaseForRetry: async () => {
      throw new Error("not used");
    },
    complete: async () => {
      throw new Error("not used");
    },
    fail: async () => {
      throw new Error("not used");
    },
  },
  screens: {
    create: async () => screen,
    findById: async () => screen,
    listByProject: async () => [screen],
    setCurrentVersion: async (_screenId, screenVersionId) => ({
      ...screen,
      currentVersionId: screenVersionId,
    }),
  },
  screenVersions: {
    create: async () => screenVersion,
    findById: async () => screenVersion,
    listByScreen: async () => [
      {
        id: screenVersion.id,
        screenId: screen.id,
        versionNumber: 1,
        operation: "generate",
        screenshotArtifactId: null,
        parentVersionId: null,
        createdAt: screenVersion.createdAt,
      },
    ],
  },
  artifacts: {
    create: async () => {
      throw new Error("not used");
    },
    findById: async () => null,
    listByScreenVersion: async () => [],
  },
};
