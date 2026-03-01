import { FIELD_TYPES } from "../field-types.js";
import { insertBeforeMarker, readFile, writeFile, toCamelCase } from "../utils.js";
import type { BlockInfo } from "../prompts.js";

function resolveZodType(field: { type: string; options?: string[] }): string {
  const ft = FIELD_TYPES[field.type]!;
  return typeof ft.zodType === "function" ? ft.zodType(field.options) : ft.zodType;
}

export function generateSchema(blocksPath: string, block: BlockInfo): void {
  let content = readFile(blocksPath);
  const camel = toCamelCase(block.name);

  // 1. Generate data schema + block schema
  const fieldsCode = block.fields
    .map((f) => `  ${f.name}: ${resolveZodType(f)},`)
    .join("\n");

  const schemaCode = [
    `// --- ${block.label} block ---`,
    "",
    `export const ${camel}BlockDataSchema = z.object({`,
    fieldsCode,
    `});`,
    "",
    `export const ${camel}BlockSchema = baseBlockSchema.extend({`,
    `  type: z.literal("${block.name}"),`,
    `  data: ${camel}BlockDataSchema,`,
    `});`,
    "",
  ].join("\n");

  content = insertBeforeMarker(content, "// --- GENERATOR:BLOCK_SCHEMA ---", schemaCode);

  // 2. Add to discriminated union
  content = insertBeforeMarker(
    content,
    "// --- GENERATOR:UNION_MEMBER ---",
    `  ${camel}BlockSchema,`,
  );

  // 3. Add to blockDefinitions
  const definitionCode = [
    `  {`,
    `    type: "${block.name}",`,
    `    label: "${block.label}",`,
    `    icon: "${block.icon}",`,
    `    description: "${block.description}",`,
    `  },`,
  ].join("\n");

  content = insertBeforeMarker(
    content,
    "// --- GENERATOR:BLOCK_DEFINITION ---",
    definitionCode,
  );

  writeFile(blocksPath, content);
}
