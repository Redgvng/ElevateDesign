import type { CanvasDocument, Project, UpdateCanvasDocumentInput } from "@odc/shared";

type StoredProject = {
  project: Project;
  canvas: CanvasDocument;
};

export type ProjectStore = {
  createProject(input: { name: string; idempotencyKey?: string }): Promise<Project>;
  listProjects(): Promise<Project[]>;
  getProject(projectId: string): Promise<Project | null>;
  getCanvas(projectId: string): Promise<CanvasDocument | null>;
  updateCanvas(
    projectId: string,
    input: UpdateCanvasDocumentInput,
  ): Promise<CanvasDocument | null>;
};

export function createInMemoryProjectStore(): ProjectStore {
  const projects = new Map<string, StoredProject>();
  const idempotencyKeys = new Map<string, { projectId: string; requestHash: string }>();
  let nextProjectId = 1;

  return {
    async createProject({ name, idempotencyKey }) {
      const requestHash = createProjectRequestHash(name);
      if (idempotencyKey) {
        const existingRequest = idempotencyKeys.get(idempotencyKey);
        if (existingRequest) {
          if (existingRequest.requestHash !== requestHash) {
            throw new ProjectIdempotencyConflictError();
          }
          return projects.get(existingRequest.projectId)!.project;
        }
      }

      const now = new Date().toISOString();
      const id = `proj_${String(nextProjectId++).padStart(6, "0")}`;
      const project: Project = {
        id,
        name,
        slug: slugify(name),
        createdAt: now,
        updatedAt: now,
        defaultDesignSystemId: null,
      };
      const canvas: CanvasDocument = {
        id: `canvas_${id}`,
        projectId: id,
        schemaVersion: "1.0",
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        updatedAt: now,
      };

      projects.set(id, { project, canvas });
      if (idempotencyKey) idempotencyKeys.set(idempotencyKey, { projectId: id, requestHash });
      return project;
    },

    async listProjects() {
      return Array.from(projects.values())
        .map((entry) => entry.project)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    },

    async getProject(projectId) {
      return projects.get(projectId)?.project ?? null;
    },

    async getCanvas(projectId) {
      return projects.get(projectId)?.canvas ?? null;
    },

    async updateCanvas(projectId, input) {
      const entry = projects.get(projectId);
      if (!entry) return null;

      const now = new Date().toISOString();
      const canvas: CanvasDocument = {
        ...entry.canvas,
        nodes: input.nodes,
        edges: input.edges,
        viewport: input.viewport,
        updatedAt: now,
      };

      entry.canvas = canvas;
      entry.project = {
        ...entry.project,
        updatedAt: now,
      };

      return canvas;
    },
  };
}

export class ProjectIdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency key was already used with a different project payload");
    this.name = "ProjectIdempotencyConflictError";
  }
}

export function createProjectRequestHash(name: string): string {
  return JSON.stringify({ name: name.trim() });
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled-project";
}
