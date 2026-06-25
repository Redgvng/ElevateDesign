import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { designSystems } from "@odc/db";
import type { DesignSystem } from "@odc/shared";
import type { DesignSystemInput, DesignSystemStore } from "./design-system-store";

export function createPgDesignSystemStore(connectionString: string): DesignSystemStore {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  return {
    async listByProject(projectId) {
      const rows = await db
        .select()
        .from(designSystems)
        .where(eq(designSystems.projectId, projectId))
        .orderBy(desc(designSystems.updatedAt));
      return rows.map(serializeDesignSystem);
    },

    async getById(projectId, designSystemId) {
      const rows = await db
        .select()
        .from(designSystems)
        .where(and(eq(designSystems.id, designSystemId), eq(designSystems.projectId, projectId)))
        .limit(1);
      return rows[0] ? serializeDesignSystem(rows[0]) : null;
    },

    async create(projectId, input) {
      const rows = await db
        .insert(designSystems)
        .values({
          id: `ds_${randomUUID()}`,
          projectId,
          name: input.name,
          description: input.description,
          tokens: input.tokens,
          designMarkdown: input.designMarkdown,
        })
        .returning();
      return serializeDesignSystem(rows[0]);
    },

    async update(projectId, designSystemId, input) {
      const rows = await db
        .update(designSystems)
        .set({
          name: input.name,
          description: input.description,
          tokens: input.tokens,
          designMarkdown: input.designMarkdown,
          updatedAt: new Date(),
        })
        .where(and(eq(designSystems.id, designSystemId), eq(designSystems.projectId, projectId)))
        .returning();
      return rows[0] ? serializeDesignSystem(rows[0]) : null;
    },
  };
}

function serializeDesignSystem(row: typeof designSystems.$inferSelect): DesignSystem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tokens: row.tokens,
    designMarkdown: row.designMarkdown,
  };
}
