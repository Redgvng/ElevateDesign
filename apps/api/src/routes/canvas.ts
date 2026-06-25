import { Hono } from "hono";
import { z } from "zod";
import { UpdateCanvasDocumentInputSchema } from "@odc/shared";
import {
  CanvasRevisionConflictError,
  type ProjectStore,
} from "../lib/project-store";

export function createCanvasRouter(store: ProjectStore): Hono {
  const app = new Hono();

  app.get("/:projectId/canvas", async (c) => {
    const canvas = await store.getCanvas(c.req.param("projectId"));
    if (!canvas) {
      return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
    }

    return c.json({ canvas });
  });

  app.put("/:projectId/canvas", async (c) => {
    const payload = await readJson(c.req.raw);
    const parsed = UpdateCanvasDocumentInputSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid canvas payload",
            details: z.treeifyError(parsed.error),
          },
        },
        400,
      );
    }

    try {
      const canvas = await store.updateCanvas(c.req.param("projectId"), parsed.data);
      if (!canvas) {
        return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
      }

      return c.json({ canvas });
    } catch (error) {
      if (error instanceof CanvasRevisionConflictError) {
        return c.json(
          {
            error: {
              code: "CANVAS_CONFLICT",
              message: "Canvas changed since it was loaded",
            },
            canvas: error.currentCanvas,
          },
          409,
        );
      }

      throw error;
    }
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
