import type { BlockField, BlockFieldType } from "@zhk/api/shared/blocks";
import { BLOCK_FIELD_TYPES } from "@zhk/api/shared/blocks";

export interface BlockMetaForm {
  name: string;
  label: string;
  description: string;
  icon: string;
  category: "none" | "content" | "project";
}

const blockFieldTypeLabels: Record<BlockFieldType, string> = {
  string: "Строка",
  text: "Многострочный текст",
  richtext: "Форматированный текст",
  number: "Число",
  boolean: "Переключатель",
  url: "URL-ссылка",
  image: "Изображение",
  images: "Галерея изображений",
  strings: "Список строк",
  select: "Выбор из списка",
  repeater: "Повторяемый блок",
};

export const blockFieldTypes = BLOCK_FIELD_TYPES.map((value) => ({
  value,
  label: blockFieldTypeLabels[value],
}));

export const blockSubFieldTypes = blockFieldTypes.filter((t) => t.value !== "repeater");

/** Очищает поле перед отправкой: трим, опции только у select и т.п. */
export function serializeBlockField(f: BlockField): BlockField {
  const out: BlockField = {
    name: f.name.trim(),
    type: f.type,
    label: f.label.trim(),
    required: f.required,
  };
  if (f.description) out.description = f.description;
  // default не редактируется в UI, но обязан переживать round-trip
  if (f.default !== undefined) out.default = f.default;
  if (f.type === "select") {
    const opts = (f.options ?? []).map((s) => s.trim()).filter(Boolean);
    if (opts.length) out.options = opts;
  }
  if (f.type === "repeater") {
    // UInput type=number при стирании эмитит "" — пропускаем всё, что не number
    if (typeof f.minItems === "number") out.minItems = f.minItems;
    if (typeof f.maxItems === "number") out.maxItems = f.maxItems;
    if (f.subFields?.length) out.subFields = f.subFields.map(serializeBlockField);
  }
  return out;
}

export function buildBlockPayload(meta: BlockMetaForm, fields: BlockField[]) {
  return {
    name: meta.name.trim(),
    label: meta.label.trim(),
    description: meta.description.trim(),
    icon: meta.icon.trim(),
    ...(meta.category !== "none" ? { category: meta.category } : {}),
    fields: fields.map(serializeBlockField),
  };
}

function isFieldValid(f: BlockField): boolean {
  if (!f.name || !f.label) return false;
  if (f.type === "select" && !(f.options ?? []).length) return false;
  if (f.type === "repeater" && f.subFields?.length) {
    return f.subFields.every(isFieldValid);
  }
  return true;
}

export function isBlockFormValid(meta: BlockMetaForm, fields: BlockField[]): boolean {
  if (!meta.name || !meta.label || !meta.description || !meta.icon) return false;
  if (!fields.length) return false;
  return fields.every(isFieldValid);
}
