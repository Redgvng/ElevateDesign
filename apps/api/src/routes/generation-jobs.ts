import { Hono } from "hono";
import { z } from "zod";
import { CreateGenerationJobInputSchema } from "@odc/shared";
import { GenerationProjectNotFoundError, type GenerationStore } from "../lib/generation-store";

export function createGenerationJobsRouter(generationStore: GenerationStore): Hono {
  const app = new Hono();

  app.post("/api/projects/:projectId/generation-jobs", async (c) => {
    const payload = await readJson(c.req.raw);
    const parsed = CreateGenerationJobInputSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid generation job payload",
            details: z.treeifyError(parsed.error),
          },
        },
        400,
      );
    }

    try {
      const stored = await generationStore.createJob(c.req.param("projectId"), parsed.data);
      return c.json(stored, 201);
    } catch (error) {
      if (error instanceof GenerationProjectNotFoundError) {
        return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
      }

      throw error;
    }
  });

  app.get("/api/generation-jobs/:jobId", async (c) => {
    const stored = await generationStore.getJob(c.req.param("jobId"));
    if (!stored) {
      return c.json({ error: { code: "NOT_FOUND", message: "Generation job not found" } }, 404);
    }

    return c.json(stored);
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
