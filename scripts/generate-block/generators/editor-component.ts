import path from "node:path";
import { FIELD_TYPES } from "../field-types.js";
import { writeFile, toPascalCase } from "../utils.js";
import type { BlockInfo } from "../prompts.js";

const RICHTEXT_IMPORT = `import { toolbarItems } from "~/utils/editor-toolbar";`;

export function generateEditorComponent(rootDir: string, block: BlockInfo): void {
  const pascal = toPascalCase(block.name);
  const filePath = path.join(
    rootDir,
    "apps/admin/app/components/blocks/editors",
    `${pascal}Block.vue`,
  );

  const hasRichtext = block.fields.some((f) => f.type === "richtext");

  // Build TypeScript type for defineModel
  const tsFields = block.fields
    .map((f) => {
      const opt = f.required ? "" : "?";
      return `  ${f.name}${opt}: ${FIELD_TYPES[f.type]!.tsType};`;
    })
    .join("\n");

  // Build template fields
  const templateFields = block.fields
    .map((f) => FIELD_TYPES[f.type]!.vueTemplate({
      fieldName: f.name,
      label: f.label,
      options: f.options,
      description: f.description,
      required: f.required,
    }))
    .join("\n");

  const scriptLines = [
    `const model = defineModel<{`,
    tsFields,
    `}>({ required: true });`,
  ];

  scriptLines.push("");
  scriptLines.push(`function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {`);
  scriptLines.push(`  model.value = { ...model.value, [key]: value };`);
  scriptLines.push(`}`);

  const imports = hasRichtext ? [RICHTEXT_IMPORT, ""] : [];

  const component = [
    `<script setup lang="ts">`,
    ...imports,
    ...scriptLines,
    `</script>`,
    ``,
    `<template>`,
    `  <div class="space-y-4">`,
    templateFields,
    `  </div>`,
    `</template>`,
    ``,
  ].join("\n");

  writeFile(filePath, component);
}
