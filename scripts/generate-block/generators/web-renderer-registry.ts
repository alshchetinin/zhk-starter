import { updateComponentRegistry } from "../utils.js";
import type { BlockInfo } from "../prompts.js";

export function updateWebRendererRegistry(rootDir: string, block: BlockInfo): void {
  updateComponentRegistry(rootDir, block.name, {
    filePath: "apps/web/app/components/blocks/renderers/index.ts",
    importMarker: "// --- GENERATOR:RENDERER_COMPONENT ---",
    entryMarker: "// --- GENERATOR:RENDERER_ENTRY ---",
  });
}
