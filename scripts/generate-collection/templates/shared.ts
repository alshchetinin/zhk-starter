import type { FieldInfo } from "../prompts.js";
import { COLLECTION_FIELD_TYPES } from "../field-types.js";

export function hasDynamicBlocks(fields: FieldInfo[]): boolean {
  return fields.some((f) => f.type === "dynamic-blocks");
}

export function blocksTypeImport(fields: FieldInfo[]): string {
  return hasDynamicBlocks(fields)
    ? `\nimport type { ContentBlock } from "@zhk/api/shared/blocks";`
    : "";
}

export function generateFormDefaults(fields: FieldInfo[]): string {
  return fields
    .map((f) => {
      const ft = COLLECTION_FIELD_TYPES[f.type];
      if (!ft) return `  // ${f.name}: unknown`;
      return `  ${f.name}: ${ft.tsDefault},`;
    })
    .join("\n");
}

export function generateFieldPayloadMapping(fields: FieldInfo[]): string {
  return fields
    .map((f) => {
      if (
        !f.required &&
        (f.type === "string" || f.type === "textarea" || f.type === "image")
      )
        return `      ${f.name}: form.${f.name} || null,`;
      return `      ${f.name}: form.${f.name},`;
    })
    .join("\n");
}

export interface FormTemplates {
  formTemplateFields: string;
  dynamicBlocksTemplate: string;
}

export function splitFormTemplates(fields: FieldInfo[]): FormTemplates {
  const regularFields = fields.filter((f) => f.type !== "dynamic-blocks");
  const dynamicBlocksFields = fields.filter((f) => f.type === "dynamic-blocks");

  const formTemplateFields = regularFields
    .map((f) => {
      const ft = COLLECTION_FIELD_TYPES[f.type];
      if (!ft) return `          <!-- ${f.name}: unknown type -->`;
      return ft.formTemplate(f.name, f.label, f.required);
    })
    .join("\n\n");

  const dynamicBlocksTemplate = dynamicBlocksFields
    .map((f) => {
      const ft = COLLECTION_FIELD_TYPES[f.type]!;
      return ft.formTemplate(f.name, f.label, f.required);
    })
    .join("\n\n");

  return { formTemplateFields, dynamicBlocksTemplate };
}
