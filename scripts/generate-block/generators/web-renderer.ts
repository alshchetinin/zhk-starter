import path from "node:path";
import { writeFile, toPascalCase, buildTsFields } from "../utils.js";
import type { BlockInfo } from "../prompts.js";

export function generateWebRenderer(rootDir: string, block: BlockInfo): void {
  const pascal = toPascalCase(block.name);
  const filePath = path.join(
    rootDir,
    "apps/web/app/components/blocks/renderers",
    `${pascal}Block.vue`,
  );

  const tsFields = buildTsFields(block.fields);

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
