import * as p from "@clack/prompts";
import { COLLECTION_FIELD_TYPES, fieldTypeOptions } from "./field-types.js";

export interface FieldInfo {
  name: string;
  type: string;
  label: string;
  required: boolean;
}

export async function collectFields(): Promise<FieldInfo[]> {
  const fields: FieldInfo[] = [];

  let addMore = true;
  while (addMore) {
    p.log.info(
      `Поле #${fields.length + 1}${fields.length === 0 ? " (title уже включён, добавьте дополнительные)" : ""}`,
    );

    const fieldName = await p.text({
      message: "Имя поля (camelCase, например: position, photoUrl):",
      validate(value) {
        if (!value) return "Имя поля обязательно";
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value))
          return "Используйте camelCase: начинайте с маленькой буквы";
        if (value === "title" || value === "id")
          return "Поле title/id уже есть по умолчанию";
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

    const ft = COLLECTION_FIELD_TYPES[fieldType as string];
    let fieldRequired = false;

    if (!ft?.alwaysOptional) {
      const reqAnswer = await p.confirm({
        message: "Поле обязательное?",
        initialValue: true,
      });
      if (p.isCancel(reqAnswer)) process.exit(0);
      fieldRequired = reqAnswer;
    }

    fields.push({
      name: fieldName,
      type: fieldType as string,
      label: fieldLabel,
      required: fieldRequired,
    });

    const continueAdding = await p.confirm({
      message: "Добавить ещё поле?",
      initialValue: false,
    });
    if (p.isCancel(continueAdding)) process.exit(0);
    addMore = continueAdding;
  }

  return fields;
}
