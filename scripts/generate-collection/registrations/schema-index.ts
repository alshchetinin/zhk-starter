import path from "node:path";
import { readFile, writeFile, type CollectionNames } from "../utils.js";

export function registerSchemaExport(
  rootDir: string,
  names: CollectionNames,
): void {
  const filePath = path.join(rootDir, "packages/db/src/schema/index.ts");
  let content = readFile(filePath);

  const exportLine = `export * from "./${names.kebab}";`;

  if (content.includes(exportLine)) return;

  if (!content.endsWith("\n")) content += "\n";
  content += exportLine + "\n";

  writeFile(filePath, content);
}
