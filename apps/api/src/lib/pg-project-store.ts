import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { canvasDocuments, projectCreateRequests, projects, workspaces } from "@odc/db";
import type { CanvasDocument, Project, UpdateCanvasDocumentInput } from "@odc/shared";
import {
  createProjectRequestHash,
  ProjectIdempotencyConflictError,
  type ProjectStore,
} from "./project-store";

export type PgProjectStoreOptions = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
};

export function createPgProjectStore(
  connectionString: string,
  options: PgProjectStoreOptions,
): ProjectStore {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);
  let workspaceInitialization: Promise<void> | null = null;

  function ensureWorkspace(): Promise<void> {
    workspaceInitialization ??= db
      .insert(workspaces)
      .values({
        id: options.workspaceId,
        name: options.workspaceName,
        slug: options.workspaceSlug,
      })
      .onConflictDoNothing({ target: workspaces.id })
      .then(() => undefined);

    return workspaceInitialization;
  }

  return {
    async createProject({ name, idempotencyKey }) {
      await ensureWorkspace();
      const requestHash = createProjectRequestHash(name);

      if (idempotencyKey) {
        const existing = await findIdempotentProject(
          db,
          options.workspaceId,
          idempotencyKey,
        );
        if (existing) {
          if (existing.requestHash !== requestHash) {
            throw new ProjectIdempotencyConflictError();
          }
          return serializeProject(existing.project);
        }
      }

      try {
        return await db.transaction(async (tx) => {
          const now = new Date();
          const id = `proj_${randomUUID()}`;
          const projectRow = {
            id,
            workspaceId: options.workspaceId,
            name,
            slug: await createUniqueSlug(tx, options.workspaceId, name, id),
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
            updatedAt: now.toISOString(),
          };

          await tx.insert(projects).values(projectRow);
          await tx.insert(canvasDocuments).values({
            projectId: id,
            revision: 1,
            document: canvas,
            updatedAt: now,
          });

          if (idempotencyKey) {
            await tx.insert(projectCreateRequests).values({
              workspaceId: options.workspaceId,
              idempotencyKey,
              requestHash,
              projectId: id,
              createdAt: now,
            });
          }

          return serializeProject(projectRow);
        });
      } catch (error) {
        if (idempotencyKey && isUniqueViolation(error)) {
          const existing = await findIdempotentProject(
            db,
            options.workspaceId,
            idempotencyKey,
          );
          if (existing) {
            if (existing.requestHash !== requestHash) {
              throw new ProjectIdempotencyConflictError();
            }
            return serializeProject(existing.project);
          }
        }

        throw error;
      }
    },

    async listProjects() {
      await ensureWorkspace();
      const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.workspaceId, options.workspaceId));
      return rows
        .map(serializeProject)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    },

    async getProject(projectId) {
      await ensureWorkspace();
      const rows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.workspaceId, options.workspaceId), eq(projects.id, projectId)))
        .limit(1);
      return rows[0] ? serializeProject(rows[0]) : null;
    },

    async getCanvas(projectId) {
      await ensureWorkspace();
      const rows = await db
        .select({ document: canvasDocuments.document })
        .from(canvasDocuments)
        .innerJoin(projects, eq(canvasDocuments.projectId, projects.id))
        .where(
          and(
            eq(projects.workspaceId, options.workspaceId),
            eq(canvasDocuments.projectId, projectId),
          ),
        )
        .limit(1);
      return rows[0]?.document ?? null;
    },

    async updateCanvas(projectId, input) {
      await ensureWorkspace();
      return db.transaction(async (tx) => {
        const rows = await tx
          .select({
            document: canvasDocuments.document,
            revision: canvasDocuments.revision,
          })
          .from(canvasDocuments)
          .innerJoin(projects, eq(canvasDocuments.projectId, projects.id))
          .where(
            and(
              eq(projects.workspaceId, options.workspaceId),
              eq(canvasDocuments.projectId, projectId),
            ),
          )
          .limit(1);

        const existing = rows[0]?.document;
        if (!existing) return null;

        const now = new Date();
        const canvas = buildUpdatedCanvasDocument(existing, input, now);

        await tx
          .update(canvasDocuments)
          .set({
            document: canvas,
            revision: (rows[0]?.revision ?? 0) + 1,
            updatedAt: now,
          })
          .where(eq(canvasDocuments.projectId, projectId));

        await tx
          .update(projects)
          .set({ updatedAt: now })
          .where(and(eq(projects.workspaceId, options.workspaceId), eq(projects.id, projectId)));

        return canvas;
      });
    },
  };
}

type Database = ReturnType<typeof drizzle>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function findIdempotentProject(
  db: Database,
  workspaceId: string,
  idempotencyKey: string,
) {
  const rows = await db
    .select({
      project: projects,
      requestHash: projectCreateRequests.requestHash,
    })
    .from(projectCreateRequests)
    .innerJoin(projects, eq(projectCreateRequests.projectId, projects.id))
    .where(
      and(
        eq(projectCreateRequests.workspaceId, workspaceId),
        eq(projectCreateRequests.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

async function createUniqueSlug(
  tx: Transaction,
  workspaceId: string,
  name: string,
  projectId: string,
): Promise<string> {
  const baseSlug = slugify(name);
  const existing = await tx
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), eq(projects.slug, baseSlug)))
    .limit(1);

  return existing[0] ? `${baseSlug}-${projectId.slice(-8)}` : baseSlug;
}

function buildUpdatedCanvasDocument(
  existing: CanvasDocument,
  input: UpdateCanvasDocumentInput,
  updatedAt: Date,
): CanvasDocument {
  return {
    ...existing,
    nodes: input.nodes,
    edges: input.edges,
    viewport: input.viewport,
    updatedAt: updatedAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function serializeProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    defaultDesignSystemId: row.defaultDesignSystemId,
  };
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled-project";
}
