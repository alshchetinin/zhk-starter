import type { CollectionNames } from "../utils.js";
import { toSnakeCase } from "../utils.js";
import type { FieldInfo } from "../prompts.js";
import { COLLECTION_FIELD_TYPES } from "../field-types.js";

export function generateSchemaTemplate(
  names: CollectionNames,
  fields: FieldInfo[],
): string {
  const drizzleImports = new Set(["pgTable", "text"]);
  let hasDynamicBlocks = false;

  for (const f of fields) {
    const ft = COLLECTION_FIELD_TYPES[f.type];
    if (ft) {
      drizzleImports.add(ft.drizzleImport);
      if (f.type === "dynamic-blocks") hasDynamicBlocks = true;
    }
  }

  const drizzleImportList = [...drizzleImports].sort().join(", ");

  const columnLines = fields
    .map((f) => {
      const ft = COLLECTION_FIELD_TYPES[f.type];
      if (!ft) return `  // ${f.name}: unknown type "${f.type}"`;
      return ft.drizzleColumn(f.name, toSnakeCase(f.name), f.required);
    })
    .join("\n");

  const contentBlockImport = hasDynamicBlocks
    ? `\nimport type { ContentBlock } from "./_shared";`
    : "";

  return `import { relations } from "drizzle-orm";
import { ${drizzleImportList} } from "drizzle-orm/pg-core";
import { baseColumns } from "./_shared";${contentBlockImport}
import { sites } from "./sites";

export const ${names.camel} = pgTable("${names.snake}", {
  ...baseColumns,
  title: text("title").notNull(),
${columnLines}
});

export const ${names.relationsVar} = relations(${names.camel}, ({ one }) => ({
  site: one(sites, {
    fields: [${names.camel}.siteId],
    references: [sites.id],
  }),
}));
`;
}
