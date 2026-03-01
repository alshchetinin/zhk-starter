import path from "node:path";
import { insertBeforeMarker, readFile, writeFile, toPascalCase } from "../utils.js";
import type { BlockInfo } from "../prompts.js";

export function updateEditorRegistry(rootDir: string, block: BlockInfo): void {
  const filePath = path.join(
    rootDir,
    "apps/admin/app/components/blocks/editors/index.ts",
  );
  const pascal = toPascalCase(block.name);

  let content = readFile(filePath);

  // Add import
  content = insertBeforeMarker(
    content,
    "// --- GENERATOR:EDITOR_IMPORT ---",
    `import ${pascal}Block from "./${pascal}Block.vue";`,
  );

  // Add to registry (quote key if it contains hyphens)
  const key = block.name.includes("-") ? `"${block.name}"` : block.name;
  content = insertBeforeMarker(
    content,
    "// --- GENERATOR:EDITOR_COMPONENT ---",
    `  ${key}: ${pascal}Block,`,
  );

  writeFile(filePath, content);
}
