import type { Component } from "vue";
import { blockDefinitions, type BlockType } from "@zhk/api/shared/blocks";

const modules = import.meta.glob<{ default: Component }>("./*Block.vue", { eager: true });

function fileNameToType(path: string): string {
  const base = path.split("/").pop()!.replace(/Block\.vue$/, "");
  return base.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const validTypes = new Set<string>(blockDefinitions.map((b) => b.type));

export const blockEditorComponents: Partial<Record<BlockType, Component>> = Object.fromEntries(
  Object.entries(modules)
    .map(([path, mod]) => [fileNameToType(path), mod.default] as const)
    .filter(([type]) => validTypes.has(type)),
) as Partial<Record<BlockType, Component>>;
