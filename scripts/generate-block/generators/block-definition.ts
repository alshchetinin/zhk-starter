import fs from "node:fs";
import path from "node:path";
import { FIELD_TYPES } from "../field-types.js";
import { readFile, writeFile, toCamelCase } from "../utils.js";
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

function emitFieldLiteral(f: FieldInfo, indent: string): string {
  const lines = [`${indent}{`];
  lines.push(`${indent}  name: "${f.name}",`);
  lines.push(`${indent}  type: "${f.type}",`);
  lines.push(`${indent}  label: ${JSON.stringify(f.label)},`);
  lines.push(`${indent}  required: ${f.required},`);
  if (f.description) lines.push(`${indent}  description: ${JSON.stringify(f.description)},`);
  if (f.options?.length) lines.push(`${indent}  options: ${JSON.stringify(f.options)},`);
  if (f.minItems !== undefined) lines.push(`${indent}  minItems: ${f.minItems},`);
  if (f.maxItems !== undefined) lines.push(`${indent}  maxItems: ${f.maxItems},`);
  if (f.subFields?.length) {
    lines.push(`${indent}  subFields: [`);
    lines.push(f.subFields.map((sf) => emitFieldLiteral(sf, `${indent}    `)).join("\n"));
    lines.push(`${indent}  ],`);
  }
  lines.push(`${indent}},`);
  return lines.join("\n");
}

function buildBlockDefinitionSource(block: BlockInfo): string {
  const camel = toCamelCase(block.name);

  const fieldLiterals = block.fields
    .map((f) => emitFieldLiteral(f, "    "))
    .join("\n");

  const dataFields = block.fields
    .map((f) => `    ${f.name}: ${resolveZodType(f)},`)
    .join("\n");

  const defaultFields = block.fields
    .map((f) => `    ${f.name}: ${resolveDefaultValue(f)},`)
    .join("\n");

  const categoryLine = block.category ? `  category: "${block.category}",\n` : "";

  return [
    `import { z } from "zod";`,
    `import { defineBlock } from "./_core";`,
    ``,
    `export const ${camel}Block = defineBlock({`,
    `  type: "${block.name}",`,
    `  label: ${JSON.stringify(block.label)},`,
    `  icon: "${block.icon}",`,
    `  description: ${JSON.stringify(block.description)},`,
    categoryLine ? categoryLine.trimEnd() : null,
    `  fields: [`,
    fieldLiterals,
    `  ],`,
    `  dataSchema: z.object({`,
    dataFields,
    `  }),`,
    `  defaultData: {`,
    defaultFields,
    `  },`,
    `});`,
    ``,
  ].filter((l) => l !== null).join("\n");
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

  writeFile(blockFile, buildBlockDefinitionSource(block));

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

/**
 * Rewrites an existing block definition (fields/meta changed in /dev/blocks).
 * Does not touch index.ts registration.
 */
export function updateBlockDefinition(rootDir: string, block: BlockInfo): void {
  const blockFile = path.join(
    rootDir,
    "packages/api/src/shared/blocks",
    `${block.name}.ts`,
  );

  if (!fs.existsSync(blockFile)) {
    throw new Error(`Блок "${block.name}" не существует (${blockFile})`);
  }

  writeFile(blockFile, buildBlockDefinitionSource(block));
}
