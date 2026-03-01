import path from "node:path";
import { insertBeforeMarker, readFile, writeFile, toPascalCase } from "../utils.js";
import type { BlockInfo } from "../prompts.js";

export function updateWebRendererRegistry(rootDir: string, block: BlockInfo): void {
  const filePath = path.join(
    rootDir,
    "apps/web/app/components/blocks/renderers/index.ts",
  );
  const pascal = toPascalCase(block.name);

  let content = readFile(filePath);

  // Add import
  content = insertBeforeMarker(
    content,
    "// --- GENERATOR:RENDERER_COMPONENT ---",
    `import ${pascal}Block from "./${pascal}Block.vue";`,
  );

  // Add to registry (quote key if it contains hyphens)
  const key = block.name.includes("-") ? `"${block.name}"` : block.name;
  content = insertBeforeMarker(
    content,
    "// --- GENERATOR:RENDERER_ENTRY ---",
    `  ${key}: ${pascal}Block,`,
  );

  writeFile(filePath, content);
}
