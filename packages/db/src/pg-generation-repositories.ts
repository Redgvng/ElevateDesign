import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  artifacts,
  generationJobs,
  screens,
  screenVersions,
  type artifactTypeEnum,
} from "./schema";
import type {
  Artifact,
  CreateGenerationJobInput,
  GenerationJob,
  Screen,
  ScreenVersion,
  ScreenVersionSummary,
} from "@odc/shared";
import type {
  ArtifactCreateInput,
  ArtifactRepository,
  GenerationJobFailure,
  GenerationJobRepository,
  GenerationRepositories,
  GenerationUnitOfWork,
  ScreenCreateInput,
  ScreenRepository,
  ScreenVersionCreateInput,
  ScreenVersionRepository,
} from "./generation-store";

type Database = ReturnType<typeof drizzle>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type DatabaseLike = Database | Transaction;

export function createPgGenerationRepositories(connectionString: string): {
  generationJobs: GenerationJobRepository;
  screens: ScreenRepository;
  screenVersions: ScreenVersionRepository;
  artifacts: ArtifactRepository;
  unitOfWork: GenerationUnitOfWork;
} {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  return {
    generationJobs: createPgGenerationJobRepository(db),
    screens: createPgScreenRepository(db),
    screenVersions: createPgScreenVersionRepository(db),
    artifacts: createPgArtifactRepository(db),
    unitOfWork: {
      transaction(callback) {
        return db.transaction((tx) => callback(createPgGenerationRepositoriesFor(tx)));
      },
    },
  };
}

function createPgGenerationRepositoriesFor(db: DatabaseLike): GenerationRepositories {
  return {
    generationJobs: createPgGenerationJobRepository(db),
    screens: createPgScreenRepository(db),
    screenVersions: createPgScreenVersionRepository(db),
    artifacts: createPgArtifactRepository(db),
  };
}

function createPgGenerationJobRepository(db: DatabaseLike): GenerationJobRepository {
  return {
    async createQueued(projectId: string, input: CreateGenerationJobInput) {
      const now = new Date();
      const rows = await db
        .insert(generationJobs)
        .values({
          id: `job_${randomUUID()}`,
          projectId,
          type: input.type,
          status: "queued",
          prompt: input.prompt,
          deviceType: input.deviceType,
          mode: input.mode,
          request: input,
          result: null,
          error: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return serializeGenerationJob(rows[0]);
    },

    async findById(jobId: string) {
      const rows = await db
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.id, jobId))
        .limit(1);

      return rows[0] ? serializeGenerationJob(rows[0]) : null;
    },

    async findByIdForUpdate(jobId: string) {
      const rows = await db
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.id, jobId))
        .limit(1)
        .for("update");

      return rows[0] ? serializeGenerationJob(rows[0]) : null;
    },

    async listQueued(limit: number) {
      const rows = await db
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.status, "queued"))
        .orderBy(asc(generationJobs.createdAt))
        .limit(limit);

      return rows.map(serializeGenerationJob);
    },

    async acquireQueued(jobId: string, leaseDurationMs: number) {
      const now = new Date();
      const leaseExpiresAt = new Date(now.getTime() + normalizeLeaseDuration(leaseDurationMs));
      const rows = await db
        .update(generationJobs)
        .set({
          status: "running",
          attemptCount: sqlIncrementAttemptCount(),
          error: null,
          startedAt: now,
          leaseExpiresAt,
          updatedAt: now,
        })
        .where(and(eq(generationJobs.id, jobId), eq(generationJobs.status, "queued")))
        .returning();

      return rows[0] ? serializeGenerationJob(rows[0]) : null;
    },

    async renewLease(jobId: string, leaseDurationMs: number) {
      const now = new Date();
      const rows = await db
        .update(generationJobs)
        .set({
          leaseExpiresAt: new Date(now.getTime() + normalizeLeaseDuration(leaseDurationMs)),
          updatedAt: now,
        })
        .where(and(eq(generationJobs.id, jobId), eq(generationJobs.status, "running")))
        .returning({ id: generationJobs.id });

      return Boolean(rows[0]);
    },

    async requeueExpiredRunning(now: Date, limit: number) {
      const candidates = await db
        .select({ id: generationJobs.id })
        .from(generationJobs)
        .where(
          and(
            eq(generationJobs.status, "running"),
            isNotNull(generationJobs.leaseExpiresAt),
            lte(generationJobs.leaseExpiresAt, now),
          ),
        )
        .orderBy(asc(generationJobs.leaseExpiresAt))
        .limit(limit);

      if (candidates.length === 0) return [];

      const rows = await db
        .update(generationJobs)
        .set({
          status: "queued",
          error: {
            code: "WORKER_LEASE_EXPIRED",
            message: "The generation worker stopped renewing its lease",
            retryable: true,
          },
          startedAt: null,
          leaseExpiresAt: null,
          updatedAt: now,
        })
        .where(
          and(
            inArray(
              generationJobs.id,
              candidates.map((candidate) => candidate.id),
            ),
            eq(generationJobs.status, "running"),
            isNotNull(generationJobs.leaseExpiresAt),
            lte(generationJobs.leaseExpiresAt, now),
          ),
        )
        .returning();

      return rows.map(serializeGenerationJob);
    },

    async cancel(jobId: string) {
      const now = new Date();
      const rows = await db
        .update(generationJobs)
        .set({
          status: "cancelled",
          error: null,
          leaseExpiresAt: null,
          cancelledAt: now,
          completedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(generationJobs.id, jobId),
            inArray(generationJobs.status, ["queued", "running"]),
          ),
        )
        .returning();

      if (rows[0]) return serializeGenerationJob(rows[0]);

      const existing = await db
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.id, jobId))
        .limit(1);
      return existing[0]?.status === "cancelled" ? serializeGenerationJob(existing[0]) : null;
    },

    async releaseForRetry(jobId: string, error: GenerationJobFailure) {
      const now = new Date();
      const rows = await db
        .update(generationJobs)
        .set({
          status: "queued",
          error,
          startedAt: null,
          leaseExpiresAt: null,
          updatedAt: now,
        })
        .where(and(eq(generationJobs.id, jobId), eq(generationJobs.status, "running")))
        .returning();

      if (!rows[0]) throw new Error(`Generation job ${jobId} cannot be released for retry`);
      return serializeGenerationJob(rows[0]);
    },

    async complete(jobId: string, result: { screenId: string; screenVersionId: string }) {
      const now = new Date();
      const rows = await db
        .update(generationJobs)
        .set({
          status: "completed",
          result,
          error: null,
          leaseExpiresAt: null,
          completedAt: now,
          updatedAt: now,
        })
        .where(and(eq(generationJobs.id, jobId), eq(generationJobs.status, "running")))
        .returning();

      if (!rows[0]) throw new Error(`Generation job ${jobId} not found`);
      return serializeGenerationJob(rows[0]);
    },

    async fail(jobId: string, error: GenerationJobFailure) {
      const now = new Date();
      const rows = await db
        .update(generationJobs)
        .set({
          status: "failed",
          error,
          leaseExpiresAt: null,
          updatedAt: now,
          completedAt: now,
        })
        .where(
          and(eq(generationJobs.id, jobId), inArray(generationJobs.status, ["queued", "running"])),
        )
        .returning();

      if (!rows[0]) throw new Error(`Generation job ${jobId} not found`);
      return serializeGenerationJob(rows[0]);
    },
  };
}

function createPgScreenRepository(db: DatabaseLike): ScreenRepository {
  return {
    async create(input: ScreenCreateInput) {
      const now = new Date();
      const rows = await db
        .insert(screens)
        .values({
          id: `screen_${randomUUID()}`,
          projectId: input.projectId,
          title: input.title,
          deviceType: input.deviceType,
          currentVersionId: input.currentVersionId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return serializeScreen(rows[0]);
    },

    async findById(screenId: string) {
      const rows = await db.select().from(screens).where(eq(screens.id, screenId)).limit(1);
      return rows[0] ? serializeScreen(rows[0]) : null;
    },

    async listByProject(projectId: string) {
      const rows = await db.select().from(screens).where(eq(screens.projectId, projectId));
      return rows
        .map(serializeScreen)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },

    async setCurrentVersion(screenId: string, screenVersionId: string) {
      const rows = await db
        .update(screens)
        .set({ currentVersionId: screenVersionId, updatedAt: new Date() })
        .where(eq(screens.id, screenId))
        .returning();

      if (!rows[0]) throw new Error(`Screen ${screenId} not found`);
      return serializeScreen(rows[0]);
    },
  };
}

function createPgScreenVersionRepository(db: DatabaseLike): ScreenVersionRepository {
  return {
    async create(input: ScreenVersionCreateInput) {
      const rows = await db
        .insert(screenVersions)
        .values({
          id: input.id ?? `ver_${randomUUID()}`,
          screenId: input.screenId,
          versionNumber: input.versionNumber,
          sourcePrompt: input.sourcePrompt,
          operation: input.operation,
          designSpec: input.designSpec,
          htmlCode: input.htmlCode,
          reactCode: input.reactCode,
          screenshotArtifactId: input.screenshotArtifactId,
          parentVersionId: input.parentVersionId,
          provider: input.provider,
          model: input.model,
        })
        .returning();

      return serializeScreenVersion(rows[0]);
    },

    async findById(screenVersionId: string) {
      const rows = await db
        .select()
        .from(screenVersions)
        .where(eq(screenVersions.id, screenVersionId))
        .limit(1);

      return rows[0] ? serializeScreenVersion(rows[0]) : null;
    },

    async listByScreen(screenId: string) {
      const rows = await db
        .select()
        .from(screenVersions)
        .where(eq(screenVersions.screenId, screenId));

      return rows
        .map(serializeScreenVersionSummary)
        .sort((left, right) => right.versionNumber - left.versionNumber);
    },
  };
}

function createPgArtifactRepository(db: DatabaseLike): ArtifactRepository {
  return {
    async create(input: ArtifactCreateInput) {
      const rows = await db
        .insert(artifacts)
        .values({
          id: input.id ?? `artifact_${randomUUID()}`,
          projectId: input.projectId,
          screenVersionId: input.screenVersionId,
          type: toDbArtifactType(input.type),
          storageKey: input.storageKey,
          checksum: input.checksum,
          mimeType: input.mimeType,
          byteSize: input.byteSize,
          width: input.width,
          height: input.height,
          metadata: input.metadata,
        })
        .returning();

      return serializeArtifact(rows[0]);
    },

    async findById(artifactId: string) {
      const rows = await db.select().from(artifacts).where(eq(artifacts.id, artifactId)).limit(1);
      return rows[0] ? serializeArtifact(rows[0]) : null;
    },

    async listByScreenVersion(screenVersionId: string) {
      const rows = await db
        .select()
        .from(artifacts)
        .where(eq(artifacts.screenVersionId, screenVersionId));
      return rows.map(serializeArtifact);
    },
  };
}

function serializeGenerationJob(row: typeof generationJobs.$inferSelect): GenerationJob {
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type,
    status: row.status,
    prompt: row.prompt,
    deviceType: row.deviceType,
    mode: row.mode,
    targetScreenId: extractTargetScreenId(row.request),
    result: row.result,
    error: row.error
      ? {
          code: row.error.code,
          message: row.error.message,
          details: row.error.details,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function extractTargetScreenId(request: Record<string, unknown> | null): string | null {
  if (request && typeof request === "object" && typeof request.screenId === "string") {
    return request.screenId;
  }
  return null;
}

function serializeScreen(row: typeof screens.$inferSelect): Screen {
  if (!row.currentVersionId) {
    throw new Error(`Screen ${row.id} has no current version`);
  }

  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    deviceType: row.deviceType,
    currentVersionId: row.currentVersionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeScreenVersion(row: typeof screenVersions.$inferSelect): ScreenVersion {
  return {
    id: row.id,
    screenId: row.screenId,
    versionNumber: row.versionNumber,
    sourcePrompt: row.sourcePrompt,
    operation: row.operation,
    designSpec: row.designSpec,
    htmlCode: row.htmlCode,
    reactCode: row.reactCode,
    screenshotArtifactId: row.screenshotArtifactId,
    parentVersionId: row.parentVersionId,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeScreenVersionSummary(
  row: typeof screenVersions.$inferSelect,
): ScreenVersionSummary {
  return {
    id: row.id,
    screenId: row.screenId,
    versionNumber: row.versionNumber,
    operation: row.operation,
    screenshotArtifactId: row.screenshotArtifactId,
    parentVersionId: row.parentVersionId,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeArtifact(row: typeof artifacts.$inferSelect): Artifact {
  return {
    id: row.id,
    projectId: row.projectId,
    screenVersionId: row.screenVersionId,
    type: fromDbArtifactType(row.type),
    storageKey: row.storageKey,
    checksum: row.checksum,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
    width: row.width,
    height: row.height,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDbArtifactType(type: Artifact["type"]): (typeof artifactTypeEnum.enumValues)[number] {
  switch (type) {
    case "reactZip":
      return "react_zip";
    case "figmaPayload":
      return "figma_payload";
    default:
      return type;
  }
}

function fromDbArtifactType(type: (typeof artifactTypeEnum.enumValues)[number]): Artifact["type"] {
  switch (type) {
    case "react_zip":
      return "reactZip";
    case "figma_payload":
      return "figmaPayload";
    default:
      return type;
  }
}

function sqlIncrementAttemptCount() {
  return sql`${generationJobs.attemptCount} + 1`;
}

function normalizeLeaseDuration(leaseDurationMs: number): number {
  if (!Number.isFinite(leaseDurationMs) || leaseDurationMs < 1_000) {
    throw new Error("Generation job lease duration must be at least 1000ms");
  }

  return Math.floor(leaseDurationMs);
}
