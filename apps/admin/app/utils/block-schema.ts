import type { BlockField } from "@zhk/api/shared/blocks";

export interface BlockMetaForm {
  name: string;
  label: string;
  description: string;
  icon: string;
  category: "none" | "content" | "project";
}

export const blockFieldTypes = [
  { value: "string", label: "Строка" },
  { value: "text", label: "Многострочный текст" },
  { value: "richtext", label: "Форматированный текст" },
  { value: "number", label: "Число" },
  { value: "boolean", label: "Переключатель" },
  { value: "url", label: "URL-ссылка" },
  { value: "image", label: "Изображение" },
  { value: "images", label: "Галерея изображений" },
  { value: "strings", label: "Список строк" },
  { value: "select", label: "Выбор из списка" },
  { value: "repeater", label: "Повторяемый блок" },
] as const;

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
    if (f.minItems !== undefined && f.minItems !== null) out.minItems = Number(f.minItems);
    if (f.maxItems !== undefined && f.maxItems !== null) out.maxItems = Number(f.maxItems);
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

export function isBlockFormValid(meta: BlockMetaForm, fields: BlockField[]): boolean {
  if (!meta.name || !meta.label || !meta.description || !meta.icon) return false;
  if (!fields.length) return false;
  return fields.every((f) => f.name && f.label);
}
