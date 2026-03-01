import path from "node:path";
import { FIELD_TYPES } from "../field-types.js";
import { insertBeforeMarker, readFile, writeFile } from "../utils.js";
import type { BlockInfo } from "../prompts.js";

function resolveDefaultValue(field: { type: string; options?: string[] }): string {
  const ft = FIELD_TYPES[field.type]!;
  return typeof ft.defaultValue === "function" ? ft.defaultValue(field.options) : ft.defaultValue;
}

export function updateDynamicZone(rootDir: string, block: BlockInfo): void {
  const filePath = path.join(
    rootDir,
    "apps/admin/app/components/blocks/BlockDynamicZone.vue",
  );

  let content = readFile(filePath);

  // Build default data object
  const defaults = block.fields
    .map((f) => `${f.name}: ${resolveDefaultValue(f)}`)
    .join(", ");

  const caseCode = `    case "${block.name}":\n      return { ${defaults} };`;

  content = insertBeforeMarker(
    content,
    "// --- GENERATOR:DEFAULT_DATA ---",
    caseCode,
  );

  writeFile(filePath, content);
}
