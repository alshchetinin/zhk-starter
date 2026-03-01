import * as p from "@clack/prompts";
import { FIELD_TYPES } from "./field-types.js";

export interface FieldInfo {
  name: string;
  type: string;
  label: string;
  options?: string[];
  description?: string;
  required: boolean;
}

export interface BlockInfo {
  name: string;
  label: string;
  description: string;
  icon: string;
  fields: FieldInfo[];
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
  const fieldTypeOptions = Object.entries(FIELD_TYPES).map(([key, ft]) => ({
    value: key,
    label: ft.label,
  }));

  let addMore = true;
  while (addMore) {
    p.log.info(
      `Поле #${fields.length + 1}${fields.length === 0 ? " (минимум 1 поле)" : ""}`,
    );

    const fieldName = await p.text({
      message: "Имя поля (camelCase, например: url, altText, caption):",
      validate(value) {
        if (!value) return "Имя поля обязательно";
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value))
          return "Используйте camelCase: начинайте с маленькой буквы";
        if (fields.some((f) => f.name === value))
          return "Поле с таким именем уже добавлено";
        return undefined;
      },
    });
    if (p.isCancel(fieldName)) process.exit(0);

    const fieldType = await p.select({
      message: "Тип поля:",
      options: fieldTypeOptions,
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

    fields.push({
      name: fieldName,
      type: fieldType as string,
      label: fieldLabel,
      options: fieldOptions,
      description: fieldDescription || undefined,
      required: fieldRequired,
    });

    const continueAdding = await p.confirm({
      message: "Добавить ещё поле?",
      initialValue: false,
    });
    if (p.isCancel(continueAdding)) process.exit(0);
    addMore = continueAdding;
  }

  return { name, label, description, icon, fields };
}
