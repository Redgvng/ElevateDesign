import { Hono } from "hono";
import type { GenerationRepositories } from "@odc/db";
import type { ProjectStore } from "../lib/project-store";
import type { ShareLinkStore } from "../lib/share-link-store";

export function publicShareUrl(token: string): string {
  return `/api/public/s/${encodeURIComponent(token)}`;
}

/**
 * Public, secure read-only sharing of a screen version. A non-guessable token
 * maps to one screen version; the public route serves the compiled HTML with a
 * strict, script-free CSP. Tokens are revocable and project-scoped to create.
 */
export function createSharingRouter(
  projectStore: ProjectStore,
  repositories: GenerationRepositories,
  shareLinkStore: ShareLinkStore,
): Hono {
  const app = new Hono();

  app.post("/api/projects/:projectId/screen-versions/:screenVersionId/share", async (c) => {
    const project = await projectStore.getProject(c.req.param("projectId"));
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
    }

    const screenVersionId = c.req.param("screenVersionId");
    const version = await repositories.screenVersions.findById(screenVersionId);
    const screen = version ? await repositories.screens.findById(version.screenId) : null;
    if (!version || !screen || screen.projectId !== project.id) {
      return c.json(
        { error: { code: "NOT_FOUND", message: "Screen version not found for this project" } },
        404,
      );
    }

    const link = await shareLinkStore.create(project.id, screenVersionId);
    return c.json({ shareLink: { token: link.token, url: publicShareUrl(link.token) } }, 201);
  });

  app.delete("/api/projects/:projectId/share-links/:token", async (c) => {
    const project = await projectStore.getProject(c.req.param("projectId"));
    if (!project) {
      return c.json({ error: { code: "NOT_FOUND", message: "Project not found" } }, 404);
    }

    const revoked = await shareLinkStore.revoke(project.id, c.req.param("token"));
    if (!revoked) {
      return c.json({ error: { code: "NOT_FOUND", message: "Share link not found" } }, 404);
    }
    return c.json({ revoked: true });
  });

  app.get("/api/public/s/:token", async (c) => {
    const link = await shareLinkStore.getActive(c.req.param("token"));
    const version = link ? await repositories.screenVersions.findById(link.screenVersionId) : null;
    if (!link || !version) {
      return c.text("This shared link is invalid or has been revoked.", 404, {
        "content-type": "text/plain; charset=utf-8",
      });
    }

    return c.body(version.htmlCode, 200, {
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      "referrer-policy": "no-referrer",
      "cache-control": "public, max-age=60",
    });
  });

  return app;
}
