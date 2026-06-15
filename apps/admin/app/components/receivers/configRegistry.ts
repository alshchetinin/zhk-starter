import type { Component } from "vue";
import { receiverTypes } from "@zhk/api/shared/receivers";

const modules = import.meta.glob<{ default: Component }>("./*ReceiverConfig.vue", { eager: true });

function fileNameToType(path: string): string {
  const base = path.split("/").pop()!.replace(/ReceiverConfig\.vue$/, "");
  return base.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const validTypes = new Set<string>(receiverTypes);

export const receiverConfigComponents: Record<string, Component> = Object.fromEntries(
  Object.entries(modules)
    .map(([path, mod]) => [fileNameToType(path), mod.default] as const)
    .filter(([type]) => validTypes.has(type)),
);
