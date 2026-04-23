import fs from "node:fs";
import path from "node:path";
import { FIELD_TYPES } from "../field-types.js";
import { insertBeforeMarker, readFile, writeFile, toCamelCase } from "../utils.js";
import type { BlockInfo, FieldInfo } from "../prompts.js";

function resolveZodType(field: FieldInfo): string {
  if (field.type === "repeater" && field.subFields) {
    const subFieldsCode = field.subFields
      .map((sf) => `    ${sf.name}: ${resolveZodType(sf)},`)
      .join("\n");
    let base = `z.array(z.object({\n${subFieldsCode}\n  }))`;
    if (field.minItems !== undefined && field.minItems > 0) {
      base += `.min(${field.minItems})`;
    }
    if (field.maxItems !== undefined) {
      base += `.max(${field.maxItems})`;
    }
    return field.required ? base : `${base}.optional()`;
  }

  const ft = FIELD_TYPES[field.type]!;
  const base = typeof ft.zodType === "function" ? ft.zodType(field.options) : ft.zodType;

  if (field.required) {
    return ft.minWhenRequired ? `${base}.min(1)` : base;
  }
  return ft.nullableWhenOptional ? `${base}.nullable()` : `${base}.optional()`;
}

function resolveDefaultValue(field: FieldInfo): string {
  if (field.type === "repeater") return "[]";
  if (!field.required) return "undefined";
  const ft = FIELD_TYPES[field.type]!;
  return typeof ft.defaultValue === "function" ? ft.defaultValue(field.options) : ft.defaultValue;
}

/**
 * Creates `packages/api/src/shared/blocks/{type}.ts` and registers it
 * in `packages/api/src/shared/blocks/index.ts`.
 */
export function generateBlockDefinition(rootDir: string, block: BlockInfo): void {
  const camel = toCamelCase(block.name);
  const blocksDir = path.join(rootDir, "packages/api/src/shared/blocks");
  const blockFile = path.join(blocksDir, `${block.name}.ts`);

  if (fs.existsSync(blockFile)) {
    throw new Error(`Файл ${blockFile} уже существует`);
  }

  const dataFields = block.fields
    .map((f) => `    ${f.name}: ${resolveZodType(f)},`)
    .join("\n");

  const defaultFields = block.fields
    .map((f) => `    ${f.name}: ${resolveDefaultValue(f)},`)
    .join("\n");

  const categoryLine = block.category ? `  category: "${block.category}",\n` : "";

  const content = [
    `import { z } from "zod";`,
    `import { defineBlock } from "./_core";`,
    ``,
    `export const ${camel}Block = defineBlock({`,
    `  type: "${block.name}",`,
    `  label: "${block.label}",`,
    `  icon: "${block.icon}",`,
    `  description: "${block.description}",`,
    categoryLine ? categoryLine.trimEnd() : null,
    `  dataSchema: z.object({`,
    dataFields,
    `  }),`,
    `  defaultData: {`,
    defaultFields,
    `  },`,
    `});`,
    ``,
  ].filter((l) => l !== null).join("\n");

  writeFile(blockFile, content);

  const indexFile = path.join(blocksDir, "index.ts");
  let idx = readFile(indexFile);

  const importLine = `import { ${camel}Block } from "./${block.name}";`;
  if (!idx.includes(importLine)) {
    idx = idx.replace(
      /(\nexport \{ defineBlock \})/,
      `\n${importLine}\n$1`,
    );
  }

  const arrayEntry = `  ${camel}Block,`;
  if (!idx.includes(arrayEntry)) {
    idx = idx.replace(
      /] as const satisfies readonly BlockDefinition\[\];/,
      `${arrayEntry}\n] as const satisfies readonly BlockDefinition[];`,
    );
  }

  writeFile(indexFile, idx);
}
