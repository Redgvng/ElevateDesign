import { describe, expect, it, vi } from "vitest";
import type { ArtifactObjectStore, ArtifactRepository } from "@odc/db";
import type { Artifact, Project } from "@odc/shared";
import type { ProjectStore } from "../lib/project-store";
import { createArtifactsRouter } from "./artifacts";

const project: Project = {
  id: "proj_1",
  name: "Artifact Project",
  slug: "artifact-project",
  createdAt: "2026-06-18T10:00:00.000Z",
  updatedAt: "2026-06-18T10:00:00.000Z",
  defaultDesignSystemId: null,
};

const artifact: Artifact = {
  id: "artifact_1",
  projectId: project.id,
  screenVersionId: "ver_1",
  type: "screenshot",
  storageKey: "generation-jobs/job_1/screenshot.png",
  checksum: "sha256:abc123",
  mimeType: "image/png",
  byteSize: 9,
  width: 1440,
  height: 1024,
  metadata: {},
  createdAt: "2026-06-18T10:01:00.000Z",
};

describe("createArtifactsRouter", () => {
  it("returns tenant-checked artifact metadata and a content URL", async () => {
    const app = createArtifactsRouter(projectStore(), artifactRepository(), null);

    const response = await app.request(`/api/artifacts/${artifact.id}`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      artifact,
      contentUrl: `/api/artifacts/${artifact.id}/content`,
    });
  });

  it("does not reveal an artifact from an inaccessible project", async () => {
    const app = createArtifactsRouter(projectStore({ accessible: false }), artifactRepository(), null);

    const response = await app.request(`/api/artifacts/${artifact.id}`);

    expect(response.status).toBe(404);
  });

  it("streams immutable screenshot content with safe headers", async () => {
    const objectStore = createObjectStore();
    const app = createArtifactsRouter(projectStore(), artifactRepository(), objectStore);

    const response = await app.request(`/api/artifacts/${artifact.id}/content`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe("9");
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="artifact_1.png"',
    );
    expect(response.headers.get("cache-control")).toBe(
      "private, max-age=31536000, immutable",
    );
    expect(response.headers.get("etag")).toBe('"sha256:abc123"');
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe("png-bytes");
  });

  it("returns 304 without touching storage when the checksum ETag matches", async () => {
    const getObject = vi.fn<ArtifactObjectStore["getObject"]>();
    const app = createArtifactsRouter(projectStore(), artifactRepository(), {
      putObject: async () => undefined,
      getObject,
      deleteObject: async () => undefined,
    });

    const response = await app.request(`/api/artifacts/${artifact.id}/content`, {
      headers: { "if-none-match": '"sha256:abc123"' },
    });

    expect(response.status).toBe(304);
    expect(getObject).not.toHaveBeenCalled();
  });

  it("reports inconsistent metadata when object storage has lost the bytes", async () => {
    const app = createArtifactsRouter(projectStore(), artifactRepository(), {
      putObject: async () => undefined,
      getObject: async () => {
        const { ObjectStorageNotFoundError } = await import("@odc/db");
        throw new ObjectStorageNotFoundError(artifact.storageKey);
      },
      deleteObject: async () => undefined,
    });

    const response = await app.request(`/api/artifacts/${artifact.id}/content`);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "ARTIFACT_STORAGE_INCONSISTENT" },
    });
  });
});

function projectStore(options: { accessible?: boolean } = {}): ProjectStore {
  return {
    createProject: async () => project,
    listProjects: async () => (options.accessible === false ? [] : [project]),
    getProject: async () => (options.accessible === false ? null : project),
    getCanvas: async () => null,
    updateCanvas: async () => null,
  };
}

function artifactRepository(): ArtifactRepository {
  return {
    create: async () => artifact,
    findById: async (artifactId) => (artifactId === artifact.id ? artifact : null),
    listByScreenVersion: async () => [artifact],
  };
}

function createObjectStore(): ArtifactObjectStore {
  return {
    putObject: async () => undefined,
    getObject: async () => ({
      body: new Response(Buffer.from("png-bytes")).body,
      contentType: "image/png",
      contentLength: 9,
      etag: '"storage-etag"',
      lastModified: "Thu, 18 Jun 2026 10:01:00 GMT",
    }),
    deleteObject: async () => undefined,
  };
}
