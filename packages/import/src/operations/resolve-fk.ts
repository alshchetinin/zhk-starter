import { and, eq, inArray } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { schemaMap, type ImportTableName } from "../schema-map";
import type { RelationMapping } from "../types";
import { chunkArray } from "../utils";
import { BATCH_SIZE } from "../constants";

/**
 * Resolves foreign key references in import data.
 * Replaces external_* fields with real DB ids by looking up related tables.
 */
export async function resolveForeignKeys(
  tx: Parameters<Parameters<typeof import("@zhk/db").db.transaction>[0]>[0],
  data: Record<string, unknown>[],
  relations: RelationMapping[],
  integrationId: string,
): Promise<Record<string, unknown>[]> {
  let resolved = data.map((item) => ({ ...item }));

  for (const relation of relations) {
    const table = schemaMap[
      relation.lookupTable as ImportTableName
    ] as PgTable & Record<string, any>;
    const lookupCol = relation.lookupColumn ?? "externalId";

    // Collect unique external IDs to look up
    const externalIds = [
      ...new Set(
        resolved
          .map((item) => item[relation.sourceKey] as string)
          .filter(Boolean),
      ),
    ];

    if (!externalIds.length) continue;

    // Build lookup map: externalValue -> internalId
    const idMap = new Map<string, string>();

    for (const chunk of chunkArray(externalIds, BATCH_SIZE)) {
      const lookupColumn = table[lookupCol];
      const idColumn = table.id;

      if (!lookupColumn || !idColumn) continue;

      const rows = await tx
        .select({ id: idColumn, lookupValue: lookupColumn })
        .from(table)
        .where(
          and(
            inArray(lookupColumn, chunk),
            table.integrationId
              ? eq(table.integrationId, integrationId)
              : undefined,
          ),
        );

      for (const row of rows) {
        if (row.lookupValue) {
          idMap.set(String(row.lookupValue), row.id);
        }
      }
    }

    // Replace external_* with resolved FK id, remove the source key
    resolved = resolved.map((item) => {
      const externalValue = item[relation.sourceKey] as string | undefined;
      const { [relation.sourceKey]: _, ...rest } = item;
      return {
        ...rest,
        [relation.targetColumn]: externalValue
          ? idMap.get(externalValue) ?? null
          : null,
      };
    });
  }

  return resolved;
}
