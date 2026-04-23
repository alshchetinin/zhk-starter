import * as p from "@clack/prompts";
import { FIELD_TYPES } from "./field-types.js";

export interface FieldInfo {
  name: string;
  type: string;
  label: string;
  options?: string[];
  description?: string;
  required: boolean;
  /** Repeater-specific */
  subFields?: FieldInfo[];
  minItems?: number;
  maxItems?: number;
}

export interface BlockInfo {
  name: string;
  label: string;
  description: string;
  icon: string;
  category?: "content" | "project";
  fields: FieldInfo[];
}

const fieldTypeOptions = Object.entries(FIELD_TYPES).map(([key, ft]) => ({
  value: key,
  label: ft.label,
}));

const subFieldTypeOptions = fieldTypeOptions.filter((o) => o.value !== "repeater");

async function collectSingleField(
  existingNames: string[],
  typeOptions: Array<{ value: string; label: string }>,
): Promise<FieldInfo> {
  const fieldName = await p.text({
    message: "Имя поля (camelCase, например: url, altText, caption):",
    validate(value) {
      if (!value) return "Имя поля обязательно";
      if (!/^[a-z][a-zA-Z0-9]*$/.test(value))
        return "Используйте camelCase: начинайте с маленькой буквы";
      if (existingNames.includes(value))
        return "Поле с таким именем уже добавлено";
      return undefined;
    },
  });
  if (p.isCancel(fieldName)) process.exit(0);

  const fieldType = await p.select({
    message: "Тип поля:",
    options: typeOptions,
  });
  if (p.isCancel(fieldType)) process.exit(0);

  const fieldLabel = await p.text({
    message: "Label поля (русский, для формы):",
    validate(value) {
      if (!value) return "Label обязателен";
      return undefined;
    },
  });
  if (p.isCancel(fieldLabel)) process.exit(0);

  let fieldOptions: string[] | undefined;
  if (fieldType === "select") {
    const optionsInput = await p.text({
      message: "Опции через запятую (например: small, medium, large):",
      validate(value) {
        if (!value) return "Нужна хотя бы одна опция";
        const opts = value.split(",").map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) return "Нужно минимум 2 опции";
        return undefined;
      },
    });
    if (p.isCancel(optionsInput)) process.exit(0);
    fieldOptions = optionsInput.split(",").map((o) => o.trim()).filter(Boolean);
  }

  const fieldDescription = await p.text({
    message: "Описание поля (подсказка, Enter — пропустить):",
    initialValue: "",
  });
  if (p.isCancel(fieldDescription)) process.exit(0);

  const fieldRequired = await p.confirm({
    message: "Поле обязательное?",
    initialValue: true,
  });
  if (p.isCancel(fieldRequired)) process.exit(0);

  return {
    name: fieldName,
    type: fieldType as string,
    label: fieldLabel,
    options: fieldOptions,
    description: fieldDescription || undefined,
    required: fieldRequired,
  };
}

async function collectRepeaterDetails(field: FieldInfo): Promise<void> {
  const minInput = await p.text({
    message: `Минимум элементов (Enter — ${field.required ? 1 : 0}):`,
    initialValue: String(field.required ? 1 : 0),
    validate(v) {
      const n = Number(v);
      if (isNaN(n) || n < 0 || !Number.isInteger(n)) return "Введите целое число >= 0";
      return undefined;
    },
  });
  if (p.isCancel(minInput)) process.exit(0);

  const maxInput = await p.text({
    message: "Максимум элементов (Enter — без ограничения):",
    initialValue: "",
    validate(v) {
      if (!v) return undefined;
      const n = Number(v);
      if (isNaN(n) || n < 1 || !Number.isInteger(n)) return "Введите целое число >= 1";
      return undefined;
    },
  });
  if (p.isCancel(maxInput)) process.exit(0);

  field.minItems = Number(minInput);
  field.maxItems = maxInput ? Number(maxInput) : undefined;

  if (field.maxItems !== undefined && field.minItems > field.maxItems) {
    p.log.warn(`minItems (${field.minItems}) > maxItems (${field.maxItems}), устанавливаю min = max`);
    field.minItems = field.maxItems;
  }

  // Collect sub-fields
  p.log.info("Поля элемента repeater:");
  const subFields: FieldInfo[] = [];

  let addMoreSub = true;
  while (addMoreSub) {
    p.log.info(`  Подполе #${subFields.length + 1}${subFields.length === 0 ? " (минимум 1)" : ""}`);

    const subField = await collectSingleField(
      subFields.map((f) => f.name),
      subFieldTypeOptions,
    );
    subFields.push(subField);

    const continueSubAdding = await p.confirm({
      message: "Добавить ещё подполе в repeater?",
      initialValue: false,
    });
    if (p.isCancel(continueSubAdding)) process.exit(0);
    addMoreSub = continueSubAdding;
  }

  field.subFields = subFields;
}

export async function collectBlockInfo(): Promise<BlockInfo> {
  const name = await p.text({
    message: "Имя блока (kebab-case, например: image, video-embed, quote):",
    validate(value) {
      if (!value) return "Имя обязательно";
      if (!/^[a-z][a-z0-9-]*$/.test(value))
        return "Используйте kebab-case: только строчные буквы, цифры и дефис";
      if (value.endsWith("-")) return "Имя не должно заканчиваться на дефис";
      return undefined;
    },
  });
  if (p.isCancel(name)) process.exit(0);

  const label = await p.text({
    message: "Label (отображается в админке, русский):",
    validate(value) {
      if (!value) return "Label обязателен";
      return undefined;
    },
  });
  if (p.isCancel(label)) process.exit(0);

  const description = await p.text({
    message: "Описание (короткое, русский):",
    validate(value) {
      if (!value) return "Описание обязательно";
      return undefined;
    },
  });
  if (p.isCancel(description)) process.exit(0);

  const iconInput = await p.text({
    message: "Tabler-иконка (Enter — i-tabler-ghost-3):",
    initialValue: "i-tabler-",
    validate(value) {
      if (value && !value.startsWith("i-tabler-"))
        return "Иконка должна начинаться с i-tabler-";
      return undefined;
    },
  });
  if (p.isCancel(iconInput)) process.exit(0);
  const icon = (!iconInput || iconInput === "i-tabler-") ? "i-tabler-ghost-3" : iconInput;

  const fields: FieldInfo[] = [];

  let addMore = true;
  while (addMore) {
    p.log.info(
      `Поле #${fields.length + 1}${fields.length === 0 ? " (минимум 1 поле)" : ""}`,
    );

    const field = await collectSingleField(
      fields.map((f) => f.name),
      fieldTypeOptions,
    );

    if (field.type === "repeater") {
      await collectRepeaterDetails(field);
    }

    fields.push(field);

    const continueAdding = await p.confirm({
      message: "Добавить ещё поле?",
      initialValue: false,
    });
    if (p.isCancel(continueAdding)) process.exit(0);
    addMore = continueAdding;
  }

  return { name, label, description, icon, fields };
}
