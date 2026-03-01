import path from "node:path";
import { FIELD_TYPES } from "../field-types.js";
import { writeFile, toPascalCase, buildTsFields } from "../utils.js";
import type { BlockInfo, FieldInfo } from "../prompts.js";

const RICHTEXT_IMPORT = `import { toolbarItems } from "~/utils/editor-toolbar";`;

function resolveSubFieldDefault(sf: FieldInfo): string {
  if (!sf.required) return "undefined";
  const ft = FIELD_TYPES[sf.type]!;
  return typeof ft.defaultValue === "function" ? ft.defaultValue(sf.options) : ft.defaultValue;
}

function generateRepeaterTemplate(f: FieldInfo): string {
  const subTemplates = f.subFields!
    .map((sf) =>
      FIELD_TYPES[sf.type]!.vueTemplate({
        fieldName: sf.name,
        label: sf.label,
        options: sf.options,
        description: sf.description,
        required: sf.required,
        modelPrefix: "item",
        updateFn: "update",
      }),
    )
    .join("\n");

  // Use single quotes for string values inside double-quoted template attribute
  const defaultItemFields = f.subFields!
    .map((sf) => `${sf.name}: ${resolveSubFieldDefault(sf).replace(/"/g, "'")}`)
    .join(", ");

  const props: string[] = [];
  if (f.minItems !== undefined && f.minItems > 0) props.push(`:min="${f.minItems}"`);
  if (f.maxItems !== undefined) props.push(`:max="${f.maxItems}"`);
  const extraProps = props.length > 0 ? `\n        ${props.join(" ")}` : "";

  const fieldOpen = [`label="${f.label}"`];
  if (f.description) fieldOpen.push(`description="${f.description}"`);
  if (f.required) fieldOpen.push("required");

  return [
    `    <UFormField ${fieldOpen.join(" ")}>`,
    `      <RepeaterField`,
    `        :model-value="model.${f.name}"`,
    `        @update:model-value="set('${f.name}', $event)"`,
    `        :default-item="() => ({ ${defaultItemFields} })"${extraProps}`,
    `      >`,
    `        <template #item="{ item, update }">`,
    `          <div class="space-y-3">`,
    subTemplates,
    `          </div>`,
    `        </template>`,
    `      </RepeaterField>`,
    `    </UFormField>`,
  ].join("\n");
}

function hasRichtextField(fields: FieldInfo[]): boolean {
  return fields.some(
    (f) =>
      f.type === "richtext" ||
      (f.type === "repeater" && f.subFields && hasRichtextField(f.subFields)),
  );
}

export function generateEditorComponent(rootDir: string, block: BlockInfo): void {
  const pascal = toPascalCase(block.name);
  const filePath = path.join(
    rootDir,
    "apps/admin/app/components/blocks/editors",
    `${pascal}Block.vue`,
  );

  const hasRichtext = hasRichtextField(block.fields);

  // Build TypeScript type for defineModel
  const tsFields = buildTsFields(block.fields);

  // Build template fields
  const templateFields = block.fields
    .map((f) => {
      if (f.type === "repeater" && f.subFields) {
        return generateRepeaterTemplate(f);
      }
      return FIELD_TYPES[f.type]!.vueTemplate({
        fieldName: f.name,
        label: f.label,
        options: f.options,
        description: f.description,
        required: f.required,
      });
    })
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
