import { describe, expect, it } from "vitest";
import type { GenerationRepositories } from "@odc/db";
import type { Project, Screen, ScreenVersion } from "@odc/shared";
import { createSharingRouter } from "./sharing";
import { createInMemoryShareLinkStore } from "../lib/share-link-store";
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
const screen: Screen = {
  id: "s1",
  projectId: "p1",
  title: "Dashboard",
  deviceType: "desktop",
  currentVersionId: "v1",
  createdAt: now,
  updatedAt: now,
};
const version = {
  id: "v1",
  screenId: "s1",
  htmlCode: "<!doctype html><html><body><main>Shared</main></body></html>",
} as unknown as ScreenVersion;

const projectStore: ProjectStore = {
  createProject: async () => project,
  listProjects: async () => [project],
  getProject: async () => project,
  getCanvas: async () => null,
  updateCanvas: async () => null,
};

const repositories = {
  screens: { findById: async () => screen },
  screenVersions: { findById: async () => version },
} as unknown as GenerationRepositories;

describe("sharing routes", () => {
  it("creates a share link, serves the public HTML, and revokes it", async () => {
    const app = createSharingRouter(projectStore, repositories, createInMemoryShareLinkStore());

    const created = await app.request("/api/projects/p1/screen-versions/v1/share", {
      method: "POST",
    });
    expect(created.status).toBe(201);
    const { shareLink } = await created.json();
    expect(shareLink.token).toMatch(/^shr_/);

    const publicView = await app.request(shareLink.url);
    expect(publicView.status).toBe(200);
    expect(publicView.headers.get("content-type")).toContain("text/html");
    expect(publicView.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(await publicView.text()).toContain("Shared");

    const revoked = await app.request(`/api/projects/p1/share-links/${shareLink.token}`, {
      method: "DELETE",
    });
    expect(revoked.status).toBe(200);

    const afterRevoke = await app.request(shareLink.url);
    expect(afterRevoke.status).toBe(404);
  });

  it("rejects sharing a version that does not belong to the project", async () => {
    const foreignRepos = {
      screens: { findById: async () => ({ ...screen, projectId: "other" }) },
      screenVersions: { findById: async () => version },
    } as unknown as GenerationRepositories;
    const app = createSharingRouter(projectStore, foreignRepos, createInMemoryShareLinkStore());

    const response = await app.request("/api/projects/p1/screen-versions/v1/share", {
      method: "POST",
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 for an unknown public token", async () => {
    const app = createSharingRouter(projectStore, repositories, createInMemoryShareLinkStore());
    const response = await app.request("/api/public/s/shr_unknown");
    expect(response.status).toBe(404);
  });
});
