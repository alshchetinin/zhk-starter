import { updateComponentRegistry } from "../utils.js";
import type { BlockInfo } from "../prompts.js";

export function updateEditorRegistry(rootDir: string, block: BlockInfo): void {
  updateComponentRegistry(rootDir, block.name, {
    filePath: "apps/admin/app/components/blocks/editors/index.ts",
    importMarker: "// --- GENERATOR:EDITOR_IMPORT ---",
    entryMarker: "// --- GENERATOR:EDITOR_COMPONENT ---",
  });
}
