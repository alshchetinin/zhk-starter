import path from "node:path";
import { FIELD_TYPES } from "../field-types.js";
import { writeFile, toPascalCase } from "../utils.js";
import type { BlockInfo } from "../prompts.js";

const TOOLBAR_ITEMS = `const toolbarItems = [
  [
    { kind: "heading" as const, level: 1, icon: "i-tabler-h-1", tooltip: { text: "Заголовок 1" } },
    { kind: "heading" as const, level: 2, icon: "i-tabler-h-2", tooltip: { text: "Заголовок 2" } },
    { kind: "heading" as const, level: 3, icon: "i-tabler-h-3", tooltip: { text: "Заголовок 3" } },
  ],
  [
    { kind: "mark" as const, mark: "bold", icon: "i-tabler-bold", tooltip: { text: "Жирный" } },
    { kind: "mark" as const, mark: "italic", icon: "i-tabler-italic", tooltip: { text: "Курсив" } },
    { kind: "mark" as const, mark: "strike", icon: "i-tabler-strikethrough", tooltip: { text: "Зачёркнутый" } },
  ],
  [
    { kind: "bulletList" as const, icon: "i-tabler-list", tooltip: { text: "Маркированный список" } },
    { kind: "orderedList" as const, icon: "i-tabler-list-numbers", tooltip: { text: "Нумерованный список" } },
  ],
  [
    { kind: "blockquote" as const, icon: "i-tabler-blockquote", tooltip: { text: "Цитата" } },
    { kind: "link" as const, icon: "i-tabler-link", tooltip: { text: "Ссылка" } },
  ],
  [
    { kind: "undo" as const, icon: "i-tabler-arrow-back-up", tooltip: { text: "Отменить" } },
    { kind: "redo" as const, icon: "i-tabler-arrow-forward-up", tooltip: { text: "Повторить" } },
  ],
];`;

function resolveDefaultValue(field: { type: string; options?: string[] }): string {
  const ft = FIELD_TYPES[field.type]!;
  return typeof ft.defaultValue === "function" ? ft.defaultValue(field.options) : ft.defaultValue;
}

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
    .map((f) => `  ${f.name}: ${FIELD_TYPES[f.type]!.tsType};`)
    .join("\n");

  // Build template fields
  const templateFields = block.fields
    .map((f) => FIELD_TYPES[f.type]!.vueTemplate(f.name, f.label, f.options))
    .join("\n");

  const scriptLines = [
    `const model = defineModel<{`,
    tsFields,
    `}>({ required: true });`,
  ];

  if (hasRichtext) {
    scriptLines.push("");
    scriptLines.push(TOOLBAR_ITEMS);
  }

  const component = [
    `<script setup lang="ts">`,
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
