import { Hono } from "hono";
import {
  ObjectStorageNotFoundError,
  type ArtifactObjectStore,
  type ArtifactRepository,
} from "@odc/db";
import type { Artifact } from "@odc/shared";
import type { ProjectStore } from "../lib/project-store";

export function createArtifactsRouter(
  projectStore: ProjectStore,
  artifacts: ArtifactRepository,
  objectStore: ArtifactObjectStore | null,
): Hono {
  const app = new Hono();

  app.get("/api/artifacts/:artifactId", async (c) => {
    const artifact = await findAccessibleArtifact(
      c.req.param("artifactId"),
      projectStore,
      artifacts,
    );
    if (!artifact) {
      return c.json({ error: { code: "NOT_FOUND", message: "Artifact not found" } }, 404);
    }

    return c.json({
      artifact,
      contentUrl: `/api/artifacts/${encodeURIComponent(artifact.id)}/content`,
    });
  });

  app.get("/api/artifacts/:artifactId/content", async (c) => {
    const artifact = await findAccessibleArtifact(
      c.req.param("artifactId"),
      projectStore,
      artifacts,
    );
    if (!artifact) {
      return c.json({ error: { code: "NOT_FOUND", message: "Artifact not found" } }, 404);
    }

    if (!objectStore) {
      return c.json(
        {
          error: {
            code: "ARTIFACT_STORAGE_UNAVAILABLE",
            message: "Artifact storage is not configured",
          },
        },
        503,
      );
    }

    const etag = createArtifactEtag(artifact);
    if (requestMatchesEtag(c.req.header("if-none-match"), etag)) {
      return new Response(null, {
        status: 304,
        headers: createArtifactHeaders(artifact, etag),
      });
    }

    try {
      const object = await objectStore.getObject(artifact.storageKey);
      if (!object.body) {
        return c.json(
          {
            error: {
              code: "ARTIFACT_STORAGE_INCONSISTENT",
              message: "Artifact metadata exists but its content is empty",
            },
          },
          502,
        );
      }

      const headers = createArtifactHeaders(artifact, etag);
      if (object.lastModified) headers.set("last-modified", object.lastModified);

      return new Response(object.body, {
        status: 200,
        headers,
      });
    } catch (error) {
      if (error instanceof ObjectStorageNotFoundError) {
        return c.json(
          {
            error: {
              code: "ARTIFACT_STORAGE_INCONSISTENT",
              message: "Artifact metadata exists but its content is missing",
            },
          },
          502,
        );
      }

      return c.json(
        {
          error: {
            code: "ARTIFACT_STORAGE_UNAVAILABLE",
            message: "Artifact content could not be read",
          },
        },
        503,
      );
    }
  });

  return app;
}

async function findAccessibleArtifact(
  artifactId: string,
  projectStore: ProjectStore,
  artifacts: ArtifactRepository,
): Promise<Artifact | null> {
  const artifact = await artifacts.findById(artifactId);
  if (!artifact) return null;

  const project = await projectStore.getProject(artifact.projectId);
  return project ? artifact : null;
}

function createArtifactHeaders(artifact: Artifact, etag: string): Headers {
  const headers = new Headers({
    "cache-control": "private, max-age=31536000, immutable",
    "content-disposition": createContentDisposition(artifact),
    "content-length": String(artifact.byteSize),
    "content-type": artifact.mimeType,
    etag,
    "x-content-type-options": "nosniff",
  });

  if (artifact.type === "html") {
    headers.set("content-security-policy", "sandbox; default-src 'none'");
  }

  return headers;
}

function createContentDisposition(artifact: Artifact): string {
  const disposition = artifact.type === "screenshot" || artifact.type === "image" ? "inline" : "attachment";
  return `${disposition}; filename="${sanitizeFilename(artifact.id)}${extensionForMimeType(artifact.mimeType)}"`;
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "text/html":
      return ".html";
    case "application/zip":
      return ".zip";
    case "application/json":
      return ".json";
    case "text/plain":
      return ".txt";
    default:
      return ".bin";
  }
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "artifact";
}

function createArtifactEtag(artifact: Artifact): string {
  return `"${artifact.checksum.replace(/["\\]/g, "")}"`;
}

function requestMatchesEtag(ifNoneMatch: string | undefined, etag: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch
    .split(",")
    .map((value) => value.trim())
    .some((value) => value === "*" || value === etag || value === `W/${etag}`);
}
