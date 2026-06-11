import fs from "node:fs";
import path from "node:path";
import { FIELD_TYPES } from "./field-types.js";
import type { FieldInfo } from "./prompts.js";

export function insertBeforeMarker(
  fileContent: string,
  marker: string,
  codeToInsert: string,
): string {
  const markerIndex = fileContent.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(
      `Маркер "${marker}" не найден. Убедитесь, что он не был удалён из файла.`,
    );
  }

  const lineStart = fileContent.lastIndexOf("\n", markerIndex) + 1;

  return (
    fileContent.slice(0, lineStart) +
    codeToInsert +
    "\n" +
    fileContent.slice(lineStart)
  );
}

export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

/** Атомарная запись: tmp-файл рядом + rename, чтобы HMR dev-сервера не видел полузаписанный файл. */
export function writeFile(filePath: string, content: string): void {
  const tmpPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, content, "utf-8");
  fs.renameSync(tmpPath, filePath);
}

export function toPascalCase(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function resolveFieldTsType(f: FieldInfo): string {
  if (f.type === "repeater" && f.subFields) {
    const subTypes = f.subFields
      .map((sf) => {
        const opt = sf.required ? "" : "?";
        return `${sf.name}${opt}: ${FIELD_TYPES[sf.type]!.tsType}`;
      })
      .join("; ");
    return `Array<{ ${subTypes} }>`;
  }
  return FIELD_TYPES[f.type]!.tsType;
}

export function buildTsFields(fields: FieldInfo[]): string {
  return fields
    .map((f) => {
      const opt = f.required ? "" : "?";
      return `  ${f.name}${opt}: ${resolveFieldTsType(f)};`;
    })
    .join("\n");
}

interface RegistryConfig {
  filePath: string;
  importMarker: string;
  entryMarker: string;
}

export function updateComponentRegistry(
  rootDir: string,
  blockName: string,
  config: RegistryConfig,
): void {
  const pascal = toPascalCase(blockName);
  const fullPath = path.join(rootDir, config.filePath);
  let content = readFile(fullPath);

  content = insertBeforeMarker(
    content,
    config.importMarker,
    `import ${pascal}Block from "./${pascal}Block.vue";`,
  );

  const key = blockName.includes("-") ? `"${blockName}"` : blockName;
  content = insertBeforeMarker(
    content,
    config.entryMarker,
    `  ${key}: ${pascal}Block,`,
  );

  writeFile(fullPath, content);
}
