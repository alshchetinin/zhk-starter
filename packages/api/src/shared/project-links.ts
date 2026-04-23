import { db } from "@zhk/db";
import { eq, type Column } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

/**
 * Sync M:M project links by clearing and re-inserting. Pass the junction table,
 * its foreign-key column back to the owner, and the column's SQL name for the insert payload.
 */
export async function syncProjectLinks(
  junctionTable: PgTable,
  foreignColumn: Column,
  foreignKeyField: string,
  entityId: string,
  projectIds: string[] | undefined,
) {
  await db.delete(junctionTable).where(eq(foreignColumn, entityId));

  if (projectIds?.length) {
    await db
      .insert(junctionTable)
      .values(
        projectIds.map((projectId) => ({
          [foreignKeyField]: entityId,
          projectId,
        })),
      );
  }
}
