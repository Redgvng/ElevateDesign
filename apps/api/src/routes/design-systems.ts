import { Hono } from "hono";
import { z } from "zod";
import { DesignSystemInputSchema } from "@odc/shared";
import type { DesignSystemStore } from "../lib/design-system-store";
import type { ProjectStore } from "../lib/project-store";

export function createDesignSystemsRouter(
  projectStore: ProjectStore,
  designSystemStore: DesignSystemStore,
): Hono {
  const app = new Hono();

  app.get("/api/projects/:projectId/design-systems", async (c) => {
    const project = await projectStore.getProject(c.req.param("projectId"));
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
    }

    const designSystems = await designSystemStore.listByProject(project.id);
    return c.json({ designSystems });
  });

  app.post("/api/projects/:projectId/design-systems", async (c) => {
    const project = await projectStore.getProject(c.req.param("projectId"));
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
    }

    const parsed = DesignSystemInputSchema.safeParse(await readJson(c.req.raw));
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid design system payload",
            details: z.treeifyError(parsed.error),
          },
        },
        400,
      );
    }

    const designSystem = await designSystemStore.create(project.id, parsed.data);
    return c.json({ designSystem }, 201);
  });

  app.get("/api/projects/:projectId/design-systems/:designSystemId", async (c) => {
    const project = await projectStore.getProject(c.req.param("projectId"));
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
    }

    const designSystem = await designSystemStore.getById(
      project.id,
      c.req.param("designSystemId"),
    );
    if (!designSystem) {
      return c.json({ error: { code: "NOT_FOUND", message: "Design system not found" } }, 404);
    }

    return c.json({ designSystem });
  });

  app.put("/api/projects/:projectId/design-systems/:designSystemId", async (c) => {
    const project = await projectStore.getProject(c.req.param("projectId"));
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
    }

    const parsed = DesignSystemInputSchema.safeParse(await readJson(c.req.raw));
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid design system payload",
            details: z.treeifyError(parsed.error),
          },
        },
        400,
      );
    }

    const designSystem = await designSystemStore.update(
      project.id,
      c.req.param("designSystemId"),
      parsed.data,
    );
    if (!designSystem) {
      return c.json({ error: { code: "NOT_FOUND", message: "Design system not found" } }, 404);
    }

    return c.json({ designSystem });
  });

  return app;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
