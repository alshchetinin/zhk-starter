import path from "node:path";
import { readFile, writeFile, type CollectionNames } from "../utils.js";

export function registerRouterImport(
  rootDir: string,
  names: CollectionNames,
): void {
  const filePath = path.join(rootDir, "packages/api/src/routers/index.ts");
  let content = readFile(filePath);

  const importLine = `import { ${names.routerVar} } from "./${names.kebab}";`;
  const routerEntry = `  ${names.camel}: ${names.routerVar},`;

  if (content.includes(importLine)) return;

  // Insert import after the last existing import line
  const lines = content.split("\n");
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.startsWith("import ")) {
      lastImportIndex = i;
    }
  }
  if (lastImportIndex === -1) {
    throw new Error("Could not find import lines in router index");
  }
  lines.splice(lastImportIndex + 1, 0, importLine);
  content = lines.join("\n");

  // Insert router entry before the closing "};" of appRouter
  const appRouterStart = content.indexOf("export const appRouter = {");
  if (appRouterStart === -1) {
    throw new Error('Could not find "export const appRouter" in router index');
  }
  const closingIndex = content.indexOf("};", appRouterStart);
  if (closingIndex === -1) {
    throw new Error("Could not find closing '};' of appRouter");
  }

  content =
    content.slice(0, closingIndex) + routerEntry + "\n" + content.slice(closingIndex);

  writeFile(filePath, content);
}
