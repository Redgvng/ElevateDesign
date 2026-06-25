import { Hono } from "hono";
import type { GenerationRepositories } from "@odc/db";
import type { Screen, ScreenVersionSummary } from "@odc/shared";
import type { ProjectStore } from "../lib/project-store";

export function createScreensRouter(
  projectStore: ProjectStore,
  repositories: GenerationRepositories,
): Hono {
  const app = new Hono();

  app.get("/api/projects/:projectId/screens", async (c) => {
    const projectId = c.req.param("projectId");
    const project = await projectStore.getProject(projectId);
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
    }

    const screens = await repositories.screens.listByProject(projectId);
    const responseScreens = await Promise.all(
      screens.map(async (screen) => {
        const versions = await repositories.screenVersions.listByScreen(screen.id);
        return {
          screen,
          currentVersion: findCurrentVersionSummary(screen, versions),
        };
      }),
    );

    return c.json({ screens: responseScreens });
  });

  app.get("/api/screens/:screenId", async (c) => {
    const screen = await repositories.screens.findById(c.req.param("screenId"));
    if (!screen) {
      return c.json({ error: { code: "NOT_FOUND", message: "Screen not found" } }, 404);
    }

    const project = await projectStore.getProject(screen.projectId);
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Screen not found" } }, 404);
    }

    const versions = await repositories.screenVersions.listByScreen(screen.id);
    return c.json({
      screen,
      currentVersion: findCurrentVersionSummary(screen, versions),
    });
  });

  app.get("/api/screens/:screenId/versions", async (c) => {
    const screen = await repositories.screens.findById(c.req.param("screenId"));
    if (!screen) {
      return c.json({ error: { code: "NOT_FOUND", message: "Screen not found" } }, 404);
    }

    const project = await projectStore.getProject(screen.projectId);
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Screen not found" } }, 404);
    }

    const versions = await repositories.screenVersions.listByScreen(screen.id);
    return c.json({ screen, versions });
  });

  app.put("/api/screens/:screenId/current-version", async (c) => {
    const screen = await repositories.screens.findById(c.req.param("screenId"));
    if (!screen) {
      return c.json({ error: { code: "NOT_FOUND", message: "Screen not found" } }, 404);
    }

    const project = await projectStore.getProject(screen.projectId);
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Screen not found" } }, 404);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = null;
    }

    const screenVersionId =
      body && typeof body === "object" && "screenVersionId" in body
        ? (body as { screenVersionId: unknown }).screenVersionId
        : undefined;

    if (typeof screenVersionId !== "string" || screenVersionId.length === 0) {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "screenVersionId is required" } },
        400,
      );
    }

    const targetVersion = await repositories.screenVersions.findById(screenVersionId);
    if (!targetVersion || targetVersion.screenId !== screen.id) {
      return c.json(
        { error: { code: "NOT_FOUND", message: "Screen version not found for this screen" } },
        404,
      );
    }

    const updatedScreen = await repositories.screens.setCurrentVersion(screen.id, screenVersionId);
    const versions = await repositories.screenVersions.listByScreen(screen.id);
    return c.json({
      screen: updatedScreen,
      currentVersion: findCurrentVersionSummary(updatedScreen, versions),
    });
  });

  app.get("/api/screen-versions/:screenVersionId", async (c) => {
    const screenVersion = await repositories.screenVersions.findById(
      c.req.param("screenVersionId"),
    );
    if (!screenVersion) {
      return c.json({ error: { code: "NOT_FOUND", message: "Screen version not found" } }, 404);
    }

    const screen = await repositories.screens.findById(screenVersion.screenId);
    if (!screen) {
      return c.json({ error: { code: "NOT_FOUND", message: "Screen version not found" } }, 404);
    }

    const project = await projectStore.getProject(screen.projectId);
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Screen version not found" } }, 404);
    }

    return c.json({ screenVersion });
  });

  return app;
}

function findCurrentVersionSummary(
  screen: Screen,
  versions: ScreenVersionSummary[],
): ScreenVersionSummary | null {
  return versions.find((version) => version.id === screen.currentVersionId) ?? versions[0] ?? null;
}
