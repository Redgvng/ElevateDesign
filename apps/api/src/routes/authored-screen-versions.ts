import { Hono } from "hono";
import { z } from "zod";
import { DesignSpecSchema, designSpecToHtml, type Screen, type ScreenVersion } from "@odc/shared";
import type { ProjectStore } from "../lib/project-store";

export type AuthoredScreenVersionPersister = {
  persistAuthoredScreenVersion(input: {
    projectId: string;
    designSpec: import("@odc/shared").DesignSpec;
    htmlCode: string;
    reactCode: string | null;
    sourcePrompt: string;
    provider: string;
    model: string;
    baseScreenId?: string | null;
    baseVersionId?: string | null;
  }): Promise<{ screen: Screen; screenVersion: ScreenVersion }>;
};

const AuthoredScreenVersionBodySchema = z.object({
  designSpec: DesignSpecSchema,
  sourcePrompt: z.string().trim().min(1).max(4000),
  baseScreenId: z.string().min(1).optional(),
  baseVersionId: z.string().min(1).optional(),
  provider: z.string().min(1).max(80).default("eve"),
  model: z.string().min(1).max(120).default("eve-agent"),
});

/**
 * Lets a trusted agent runtime (Eve) persist a DesignSpec it authored as a
 * ScreenVersion, without going through the AI provider job pipeline. The
 * backend stays the source of truth: it re-validates the spec and compiles the
 * canonical HTML itself.
 */
export function createAuthoredScreenVersionsRouter(
  projectStore: ProjectStore,
  persister: AuthoredScreenVersionPersister,
): Hono {
  const app = new Hono();

  app.post("/api/projects/:projectId/screen-versions", async (c) => {
    const project = await projectStore.getProject(c.req.param("projectId"));
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
    }

    const parsed = AuthoredScreenVersionBodySchema.safeParse(await readJson(c.req.raw));
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid authored screen version payload",
            details: z.treeifyError(parsed.error),
          },
        },
        400,
      );
    }

    const { designSpec, sourcePrompt, baseScreenId, baseVersionId, provider, model } = parsed.data;
    const htmlCode = designSpecToHtml(designSpec);

    try {
      const result = await persister.persistAuthoredScreenVersion({
        projectId: project.id,
        designSpec,
        htmlCode,
        reactCode: null,
        sourcePrompt,
        provider,
        model,
        baseScreenId: baseScreenId ?? null,
        baseVersionId: baseVersionId ?? null,
      });
      return c.json(result, 201);
    } catch (error) {
      return c.json(
        {
          error: {
            code: "AUTHORED_VERSION_FAILED",
            message: error instanceof Error ? error.message : "Could not persist screen version",
          },
        },
        409,
      );
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
