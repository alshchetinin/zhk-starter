import { db } from "@zhk/db";
import { eq } from "drizzle-orm";
import type { ImportData } from "@zhk/macro";
import { schemaMap, type ImportTableName } from "./schema-map";
import { IMPORT_ORDER, RELATIONS_MAP, JOIN_TABLES } from "./constants";
import { resolveForeignKeys } from "./operations/resolve-fk";
import { upsertRecords, toDbValues } from "./operations/upsert";
import { deleteObsoleteRecords } from "./operations/delete-obsolete";
import type { ImportResult, TableImportResult } from "./types";

/**
 * Import all data into the database within a single transaction.
 * Follows topological order for FK dependencies.
 */
export async function importAllData(
  importData: ImportData,
  integrationId: string,
  _tenantId: string,
): Promise<ImportResult> {
  const results: TableImportResult[] = [];

  try {
    await db.transaction(async (tx) => {
      // Phase 1: Delete obsolete records (reverse FK order)
      // Skip join tables — they'll be cleared during upsert
      const deleteOrder = [...IMPORT_ORDER].reverse();
      for (const tableName of deleteOrder) {
        const data = getTableData(importData, tableName);
        if (!data?.length) continue;
        if (JOIN_TABLES.includes(tableName)) continue;

        const table = schemaMap[tableName] as any;
        const externalIds = data
          .map(
            (item) =>
              (item as Record<string, unknown>).external_id as string,
          )
          .filter(Boolean);

        const deleted = await deleteObsoleteRecords(
          tx,
          tableName,
          table,
          externalIds,
          integrationId,
        );

        if (deleted > 0) {
          console.log(`[import] ${tableName}: deleted ${deleted} obsolete`);
        }
      }

      // Phase 1.5: Clear join tables for this integration's entities
      for (const joinTableName of JOIN_TABLES) {
        await clearJoinTable(tx, joinTableName, integrationId);
      }

      // Phase 2: Upsert in FK order
      for (const tableName of IMPORT_ORDER) {
        const rawData = getTableData(importData, tableName);
        if (!rawData?.length) continue;

        const table = schemaMap[tableName] as any;
        const relations = RELATIONS_MAP[tableName];

        // Convert to DB format (camelCase keys, proper types)
        let dbData = rawData.map((item) =>
          toDbValues(item as Record<string, unknown>),
        );

        // Resolve foreign keys
        if (relations?.length) {
          dbData = await resolveForeignKeys(
            tx,
            dbData,
            relations,
            integrationId,
          );
        }

        // Remove any remaining external_* keys that weren't resolved
        dbData = dbData.map((item) => {
          const cleaned: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(item)) {
            if (!key.startsWith("external_") && key !== "tag_name") {
              cleaned[key] = value;
            }
          }
          return cleaned;
        });

        const { inserted, updated } = await upsertRecords(
          tx,
          tableName,
          table,
          dbData,
          integrationId,
        );

        results.push({
          table: tableName,
          inserted,
          updated,
          deleted: 0,
        });

        console.log(
          `[import] ${tableName}: +${inserted} ~${updated}`,
        );
      }
    });

    return { success: true, results };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`[import] Transaction failed: ${message}`);
    return { success: false, results, error: message };
  }
}

/**
 * Get data array from ImportData by table name.
 */
function getTableData(
  importData: ImportData,
  tableName: ImportTableName,
): Record<string, unknown>[] | undefined {
  const data = importData[tableName as keyof ImportData];
  return data as Record<string, unknown>[] | undefined;
}

/**
 * Clear join table records that reference entities from this integration.
 */
async function clearJoinTable(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tableName: ImportTableName,
  integrationId: string,
): Promise<void> {
  if (tableName === "apartment_layout_tags") {
    // Delete only IMPORTED tag associations on layouts of this integration.
    // Manual tags (tag.integration_id IS NULL) survive sync — admins can
    // attach them to imported layouts and rely on them not being wiped.
    const { apartmentLayouts, apartmentLayoutTags, tags } = await import(
      "@zhk/db/schema"
    );
    const layouts = await tx
      .select({ id: apartmentLayouts.id })
      .from(apartmentLayouts)
      .where(eq(apartmentLayouts.integrationId, integrationId));

    if (layouts.length) {
      const { and, inArray, isNotNull } = await import("drizzle-orm");
      const importedTags = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(isNotNull(tags.integrationId));
      if (importedTags.length) {
        await tx
          .delete(apartmentLayoutTags)
          .where(
            and(
              inArray(
                apartmentLayoutTags.layoutId,
                layouts.map((l) => l.id),
              ),
              inArray(
                apartmentLayoutTags.tagId,
                importedTags.map((t) => t.id),
              ),
            ),
          );
      }
    }
  } else if (tableName === "apartment_promotions") {
    // Delete apartment promotions where apartment belongs to this integration
    const { apartments, apartmentPromotions } = await import(
      "@zhk/db/schema"
    );
    const apts = await tx
      .select({ id: apartments.id })
      .from(apartments)
      .where(eq(apartments.integrationId, integrationId));

    if (apts.length) {
      const { inArray } = await import("drizzle-orm");
      await tx
        .delete(apartmentPromotions)
        .where(
          inArray(
            apartmentPromotions.apartmentId,
            apts.map((a) => a.id),
          ),
        );
    }
  }
}
