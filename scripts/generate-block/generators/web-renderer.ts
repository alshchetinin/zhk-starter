import path from "node:path";
import { FIELD_TYPES } from "../field-types.js";
import { writeFile, toPascalCase } from "../utils.js";
import type { BlockInfo, FieldInfo } from "../prompts.js";

function resolveFieldTsType(f: FieldInfo): string {
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

export function generateWebRenderer(rootDir: string, block: BlockInfo): void {
  const pascal = toPascalCase(block.name);
  const filePath = path.join(
    rootDir,
    "apps/web/app/components/blocks/renderers",
    `${pascal}Block.vue`,
  );

  const tsFields = block.fields
    .map((f) => {
      const opt = f.required ? "" : "?";
      return `  ${f.name}${opt}: ${resolveFieldTsType(f)};`;
    })
    .join("\n");

  const component = [
    `<script setup lang="ts">`,
    `defineProps<{`,
    tsFields,
    `}>();`,
    `</script>`,
    ``,
    `<template>`,
    `  <div class="section">`,
    `    <div class="container-web">`,
    `      <!-- TODO: реализовать рендеринг блока "${block.label}" -->`,
    `      <pre class="rounded-xl bg-[var(--web-bg-muted)] p-6 text-sm overflow-x-auto">{{ $props }}</pre>`,
    `    </div>`,
    `  </div>`,
    `</template>`,
    ``,
  ].join("\n");

  writeFile(filePath, component);
}
