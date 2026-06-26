import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { shareLinks } from "@odc/db";
import { createShareToken, type ShareLink, type ShareLinkStore } from "./share-link-store";

export function createPgShareLinkStore(connectionString: string): ShareLinkStore {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  return {
    async create(projectId, screenVersionId) {
      const rows = await db
        .insert(shareLinks)
        .values({ id: createShareToken(), projectId, screenVersionId })
        .returning();
      return serialize(rows[0]);
    },

    async getActive(token) {
      const rows = await db
        .select()
        .from(shareLinks)
        .where(and(eq(shareLinks.id, token), isNull(shareLinks.revokedAt)))
        .limit(1);
      return rows[0] ? serialize(rows[0]) : null;
    },

    async revoke(projectId, token) {
      const rows = await db
        .update(shareLinks)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(shareLinks.id, token),
            eq(shareLinks.projectId, projectId),
            isNull(shareLinks.revokedAt),
          ),
        )
        .returning();
      return rows.length > 0;
    },
  };
}

function serialize(row: typeof shareLinks.$inferSelect): ShareLink {
  return {
    token: row.id,
    projectId: row.projectId,
    screenVersionId: row.screenVersionId,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
  };
}
