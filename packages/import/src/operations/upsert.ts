import { and, eq, inArray } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { chunkArray } from "../utils";
import { BATCH_SIZE, JOIN_TABLES } from "../constants";
import type { ImportTableName } from "../schema-map";

/**
 * Maps import data keys (snake_case) to Drizzle column names (camelCase).
 */
const COLUMN_MAP: Record<string, string> = {
  external_id: "externalId",
  integration_id: "integrationId",
  tenant_id: "siteId",
  floor_number: "floorNumber",
  floors_count: "floorsCount",
  svg_scheme: "svgScheme",
  floor_image: "floorImage",
  rooms_count: "roomsCount",
  floor_range: "floorRange",
  price_range: "priceRange",
  ceiling_height: "ceilingHeight",
  default_layout_image: "defaultLayoutImage",
  three_d_layout_image: "threeDLayoutImage",
  three_d_tour_url: "threeDTourUrl",
  apartment_number: "apartmentNumber",
  old_price: "oldPrice",
  is_published: "isPublished",
  is_popular: "isPopular",
  is_studio: "isStudio",
  is_apartment: "isApartment",
  monthly_mortgage_payment: "monthlyMortgagePayment",
  window_view: "windowView",
  completion_date: "completionDate",
  date_start: "dateStart",
  date_end: "dateEnd",
  layout_image: "layoutImage",
  commerce_number: "commerceNumber",
  title_admin: "titleAdmin",
  masterplan_image: "masterplanImage",
  masterplan_scheme: "masterplanScheme",
  sun_position: "sunPosition",
};

/**
 * Convert import data (snake_case) to Drizzle values (camelCase).
 * Also converts Date objects to ISO strings for date columns,
 * and numbers to strings for numeric columns.
 */
function toDbValues(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const dbKey = COLUMN_MAP[key] ?? key;

    // Convert Date to ISO date string for date columns
    if (value instanceof Date) {
      result[dbKey] = value.toISOString().split("T")[0];
    }
    // Convert numeric values to strings for Drizzle numeric columns
    else if (
      typeof value === "number" &&
      (dbKey === "area" ||
        dbKey === "price" ||
        dbKey === "oldPrice" ||
        dbKey === "ceilingHeight" ||
        dbKey === "monthlyMortgagePayment")
    ) {
      result[dbKey] = String(value);
    } else {
      result[dbKey] = value;
    }
  }
  return result;
}

/**
 * Upsert records for a given table.
 * Finds existing records by (externalId, integrationId),
 * splits into toInsert and toUpdate, batch processes.
 */
export async function upsertRecords(
  tx: Parameters<Parameters<typeof import("@zhk/db").db.transaction>[0]>[0],
  tableName: ImportTableName,
  table: PgTable & Record<string, any>,
  data: Record<string, unknown>[],
  integrationId: string,
): Promise<{ inserted: number; updated: number }> {
  if (!data.length) return { inserted: 0, updated: 0 };

  const isJoinTable = JOIN_TABLES.includes(tableName);

  if (isJoinTable) {
    return upsertJoinTable(tx, table, data);
  }

  if (tableName === "tags") {
    return upsertTags(tx, table, data, integrationId);
  }

  // For regular tables, find existing by externalId + integrationId
  const externalIds = data
    .map((item) => item.externalId as string)
    .filter(Boolean);

  const existingMap = new Map<string, string>();

  if (externalIds.length && table.externalId) {
    for (const chunk of chunkArray(externalIds, BATCH_SIZE)) {
      const rows = await tx
        .select({ id: table.id, externalId: table.externalId })
        .from(table)
        .where(
          and(
            inArray(table.externalId, chunk),
            eq(table.integrationId, integrationId),
          ),
        );

      for (const row of rows) {
        if (row.externalId) {
          existingMap.set(row.externalId, row.id);
        }
      }
    }
  }

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: { id: string; values: Record<string, unknown> }[] = [];
  let skippedMissingExternalId = 0;

  for (const item of data) {
    const externalId = item.externalId as string;

    if (!externalId) {
      skippedMissingExternalId++;
      continue;
    }

    if (tableName === "apartment_layouts") {
      item.syncedFields = computeSyncedFields(item);
    }

    const existingId = existingMap.get(externalId);

    if (existingId) {
      const { id: _, createdAt: _c, ...updateValues } = item;
      toUpdate.push({ id: existingId, values: updateValues });
    } else {
      toInsert.push(item);
    }
  }

  if (skippedMissingExternalId > 0) {
    console.warn(
      `[import] ${tableName}: skipped ${skippedMissingExternalId} records without externalId`,
    );
  }

  // Batch insert
  for (const chunk of chunkArray(toInsert, BATCH_SIZE)) {
    await tx.insert(table).values(chunk);
  }

  // Update one by one (each record may have different columns)
  for (const { id, values } of toUpdate) {
    await tx.update(table).set(values).where(eq(table.id, id));
  }

  return { inserted: toInsert.length, updated: toUpdate.length };
}

/**
 * Handle join tables (apartment_layout_tags, apartment_promotions).
 * These have no id or externalId — just delete all and re-insert.
 */
async function upsertJoinTable(
  tx: Parameters<Parameters<typeof import("@zhk/db").db.transaction>[0]>[0],
  table: PgTable & Record<string, any>,
  data: Record<string, unknown>[],
): Promise<{ inserted: number; updated: number }> {
  // Filter out records where FK resolution failed (null FKs)
  const validData = data.filter((item) => {
    return Object.values(item).every((v) => v !== null && v !== undefined);
  });

  for (const chunk of chunkArray(validData, BATCH_SIZE)) {
    // onConflictDoNothing: a manually-attached link (is_manual=true) for
    // the same (layoutId, tagId) must survive a re-import.
    await tx.insert(table).values(chunk).onConflictDoNothing();
  }

  return { inserted: validData.length, updated: 0 };
}

/**
 * Upsert tags by (site_id, name) — multiple sources can ship the same tag
 * name with different external_ids; we collapse them into one canonical row.
 */
async function upsertTags(
  tx: Parameters<Parameters<typeof import("@zhk/db").db.transaction>[0]>[0],
  table: PgTable & Record<string, any>,
  data: Record<string, unknown>[],
  integrationId: string,
): Promise<{ inserted: number; updated: number }> {
  // Dedupe input by (siteId, name) — keep first occurrence
  const byKey = new Map<string, Record<string, unknown>>();
  for (const item of data) {
    const name = item.name as string | undefined;
    if (!name) continue;
    const siteId = (item.siteId as string | undefined) ?? "default";
    const key = `${siteId}::${name}`;
    if (!byKey.has(key)) byKey.set(key, { ...item, siteId });
  }
  const unique = [...byKey.values()];

  if (!unique.length) return { inserted: 0, updated: 0 };

  // Find existing by (site_id, name)
  const names = unique.map((u) => u.name as string);
  const existingMap = new Map<
    string,
    { id: string; integrationId: string | null }
  >();
  for (const chunk of chunkArray(names, BATCH_SIZE)) {
    const rows = await tx
      .select({
        id: table.id,
        siteId: table.siteId,
        name: table.name,
        integrationId: table.integrationId,
      })
      .from(table)
      .where(inArray(table.name, chunk));
    for (const row of rows) {
      existingMap.set(`${row.siteId}::${row.name}`, {
        id: row.id,
        integrationId: row.integrationId,
      });
    }
  }

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: { id: string; values: Record<string, unknown> }[] = [];

  for (const item of unique) {
    const key = `${item.siteId}::${item.name}`;
    const existing = existingMap.get(key);
    if (existing) {
      // Don't override a manual tag's name or claim it as imported.
      // Just refresh externalId so future syncs see the link.
      const values: Record<string, unknown> = {
        externalId: item.externalId,
      };
      if (existing.integrationId) {
        values.integrationId = integrationId;
        values.name = item.name;
      }
      toUpdate.push({ id: existing.id, values });
    } else {
      item.integrationId = integrationId;
      toInsert.push(item);
    }
  }

  for (const chunk of chunkArray(toInsert, BATCH_SIZE)) {
    await tx.insert(table).values(chunk);
  }
  for (const { id, values } of toUpdate) {
    await tx.update(table).set(values).where(eq(table.id, id));
  }

  return { inserted: toInsert.length, updated: toUpdate.length };
}

export { toDbValues };

const SYNCED_FIELDS_EXCLUDE = new Set([
  "externalId",
  "integrationId",
  "siteId",
  "id",
  "createdAt",
  "updatedAt",
  "gallery",
  "syncedFields",
]);

function computeSyncedFields(item: Record<string, unknown>): string[] {
  return Object.keys(item).filter(
    (k) => !SYNCED_FIELDS_EXCLUDE.has(k) && item[k] !== undefined,
  );
}
