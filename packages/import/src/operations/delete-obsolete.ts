import { eq, inArray } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { JOIN_TABLES } from "../constants";
import type { ImportTableName } from "../schema-map";
import { chunkArray } from "../utils";
import { BATCH_SIZE } from "../constants";

/**
 * Delete records that exist in DB but are not in the current import data.
 * For join tables, deletes all records for the integration and re-inserts.
 */
export async function deleteObsoleteRecords(
  tx: Parameters<Parameters<typeof import("@zhk/db").db.transaction>[0]>[0],
  tableName: ImportTableName,
  table: PgTable & Record<string, any>,
  importedExternalIds: string[],
  integrationId: string,
): Promise<number> {
  const isJoinTable = JOIN_TABLES.includes(tableName);

  if (isJoinTable) {
    // For join tables, we can't easily diff. We delete all records
    // that reference entities from this integration and re-insert.
    // The actual deletion by FK is complex, so we handle it
    // in the engine by clearing join tables before upsert.
    return 0;
  }

  if (!table.externalId || !table.integrationId) return 0;

  // Get all existing records for this integration
  const existing = await tx
    .select({ id: table.id, externalId: table.externalId })
    .from(table)
    .where(eq(table.integrationId, integrationId));

  const importedSet = new Set(importedExternalIds);
  const toDelete = existing.filter(
    (row) => row.externalId && !importedSet.has(row.externalId),
  );

  if (!toDelete.length) return 0;

  const idsToDelete = toDelete.map((r) => r.id);
  for (const chunk of chunkArray(idsToDelete, BATCH_SIZE)) {
    await tx.delete(table).where(inArray(table.id, chunk));
  }

  return toDelete.length;
}
