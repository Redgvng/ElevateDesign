import { Hono } from "hono";
import { z } from "zod";
import { CreateProjectInputSchema } from "@odc/shared";
import {
  ProjectIdempotencyConflictError,
  type ProjectStore,
} from "../lib/project-store";

export function createProjectsRouter(store: ProjectStore): Hono {
  const app = new Hono();

  app.post("/", async (c) => {
    const payload = await readJson(c.req.raw);
    const parsed = CreateProjectInputSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid project payload",
            details: z.treeifyError(parsed.error),
          },
        },
        400,
      );
    }

    const idempotencyKey = c.req.header("Idempotency-Key")?.trim() || undefined;

    try {
      const project = await store.createProject({ ...parsed.data, idempotencyKey });
      return c.json({ project }, 201);
    } catch (error) {
      if (error instanceof ProjectIdempotencyConflictError) {
        return c.json(
          {
            error: {
              code: "IDEMPOTENCY_CONFLICT",
              message: error.message,
            },
          },
          409,
        );
      }

      throw error;
    }
  });

  app.get("/", async (c) => c.json({ projects: await store.listProjects() }));

  app.get("/:projectId", async (c) => {
    const project = await store.getProject(c.req.param("projectId"));
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
    }
    return c.json({ project });
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
