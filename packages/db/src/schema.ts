import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { CanvasDocument, DesignSpec } from "@odc/shared";

export const workspaceMembershipRoleEnum = pgEnum("workspace_membership_role", [
  "owner",
  "member",
]);

export const deviceTypeEnum = pgEnum("device_type", [
  "mobile",
  "tablet",
  "desktop",
  "agnostic",
]);

export const generationModeEnum = pgEnum("generation_mode", ["fast", "quality"]);

export const generationJobTypeEnum = pgEnum("generation_job_type", [
  "generate_screen",
  "edit_screen",
  "generate_variants",
]);

export const generationJobStatusEnum = pgEnum("generation_job_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const screenVersionOperationEnum = pgEnum("screen_version_operation", [
  "generate",
  "edit",
  "variant",
  "import",
]);

export const artifactTypeEnum = pgEnum("artifact_type", [
  "screenshot",
  "html",
  "react_zip",
  "image",
  "log",
  "figma_payload",
]);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("workspaces_slug_unique").on(table.slug)],
);

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceMembershipRoleEnum("role").default("member").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_memberships_user_idx").on(table.userId),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    defaultDesignSystemId: text("default_design_system_id"),
  },
  (table) => [
    uniqueIndex("projects_workspace_slug_unique").on(table.workspaceId, table.slug),
    index("projects_workspace_updated_idx").on(table.workspaceId, table.updatedAt),
  ],
);

export const canvasDocuments = pgTable("canvas_documents", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  revision: integer("revision").default(1).notNull(),
  document: jsonb("document").$type<CanvasDocument>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projectCreateRequests = pgTable(
  "project_create_requests",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.idempotencyKey] }),
    index("project_create_requests_project_idx").on(table.projectId),
  ],
);

export const screens = pgTable(
  "screens",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    deviceType: deviceTypeEnum("device_type").notNull(),
    currentVersionId: text("current_version_id").references(
      (): AnyPgColumn => screenVersions.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("screens_project_updated_idx").on(table.projectId, table.updatedAt)],
);

export const screenVersions = pgTable(
  "screen_versions",
  {
    id: text("id").primaryKey(),
    screenId: text("screen_id")
      .notNull()
      .references(() => screens.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    sourcePrompt: text("source_prompt").notNull(),
    operation: screenVersionOperationEnum("operation").notNull(),
    designSpec: jsonb("design_spec").$type<DesignSpec>().notNull(),
    htmlCode: text("html_code").notNull(),
    reactCode: text("react_code"),
    screenshotArtifactId: text("screenshot_artifact_id").references(
      (): AnyPgColumn => artifacts.id,
      { onDelete: "set null" },
    ),
    parentVersionId: text("parent_version_id").references(
      (): AnyPgColumn => screenVersions.id,
      { onDelete: "set null" },
    ),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("screen_versions_screen_number_unique").on(
      table.screenId,
      table.versionNumber,
    ),
    index("screen_versions_screen_created_idx").on(table.screenId, table.createdAt),
  ],
);

export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: generationJobTypeEnum("type").notNull(),
    status: generationJobStatusEnum("status").default("queued").notNull(),
    prompt: text("prompt").notNull(),
    deviceType: deviceTypeEnum("device_type").notNull(),
    mode: generationModeEnum("mode").notNull(),
    request: jsonb("request").$type<Record<string, unknown>>().notNull(),
    result: jsonb("result").$type<{ screenId: string; screenVersionId: string } | null>(),
    error: jsonb("error").$type<{
      code: string;
      message: string;
      details?: unknown;
      retryable?: boolean;
    } | null>(),
    idempotencyKey: text("idempotency_key"),
    provider: text("provider"),
    model: text("model"),
    attemptCount: integer("attempt_count").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    queueName: text("queue_name").default("generation").notNull(),
    sessionId: text("session_id"),
    continuationToken: text("continuation_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (table) => [
    index("generation_jobs_project_created_idx").on(table.projectId, table.createdAt),
    index("generation_jobs_status_created_idx").on(table.status, table.createdAt),
    uniqueIndex("generation_jobs_project_idempotency_unique")
      .on(table.projectId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
  ],
);

export const artifacts = pgTable(
  "artifacts",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    screenVersionId: text("screen_version_id").references(() => screenVersions.id, {
      onDelete: "cascade",
    }),
    type: artifactTypeEnum("type").notNull(),
    storageKey: text("storage_key").notNull(),
    checksum: text("checksum").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("artifacts_storage_key_unique").on(table.storageKey),
    index("artifacts_project_created_idx").on(table.projectId, table.createdAt),
    index("artifacts_screen_version_idx").on(table.screenVersionId),
  ],
);
