export interface VueTemplateContext {
  fieldName: string;
  label: string;
  options?: string[];
  description?: string;
  required: boolean;
  /** Object prefix for model binding (default: "model", use "item" in repeater) */
  modelPrefix?: string;
  /** Update function name (default: "set", use "update" in repeater) */
  updateFn?: string;
}

export interface FieldType {
  label: string;
  zodType: string | ((options?: string[]) => string);
  tsType: string;
  defaultValue: string | ((options?: string[]) => string);
  vueTemplate: (ctx: VueTemplateContext) => string;
  needsEditorSetup?: boolean;
  /** Add .min(1) to zodType when field is required */
  minWhenRequired?: boolean;
  /** Use .nullable() instead of .optional() when field is optional */
  nullableWhenOptional?: boolean;
}

function formFieldOpen(ctx: VueTemplateContext): string {
  const props: string[] = [`label="${ctx.label}"`];
  if (ctx.description) props.push(`description="${ctx.description}"`);
  if (ctx.required) props.push("required");
  return `<UFormField ${props.join(" ")}>`;
}

export const FIELD_TYPES: Record<string, FieldType> = {
  string: {
    label: "Строка (string)",
    zodType: "z.string()",
    tsType: "string",
    defaultValue: '""',
    minWhenRequired: true,
    vueTemplate: (ctx) => {
      const m = ctx.modelPrefix ?? "model";
      const u = ctx.updateFn ?? "set";
      return `    ${formFieldOpen(ctx)}\n      <UInput :model-value="${m}.${ctx.fieldName}" @update:model-value="${u}('${ctx.fieldName}', $event)" />\n    </UFormField>`;
    },
  },

  text: {
    label: "Многострочный текст (textarea)",
    zodType: "z.string()",
    tsType: "string",
    defaultValue: '""',
    minWhenRequired: true,
    vueTemplate: (ctx) => {
      const m = ctx.modelPrefix ?? "model";
      const u = ctx.updateFn ?? "set";
      return `    ${formFieldOpen(ctx)}\n      <UTextarea :model-value="${m}.${ctx.fieldName}" @update:model-value="${u}('${ctx.fieldName}', $event)" :rows="4" />\n    </UFormField>`;
    },
  },

  richtext: {
    label: "Форматированный текст (rich text)",
    zodType: "z.string()",
    tsType: "string",
    defaultValue: '""',
    minWhenRequired: true,
    needsEditorSetup: true,
    vueTemplate: (ctx) => {
      const m = ctx.modelPrefix ?? "model";
      const u = ctx.updateFn ?? "set";
      return [
        `    ${formFieldOpen(ctx)}`,
        `      <UEditor :model-value="${m}.${ctx.fieldName}" @update:model-value="${u}('${ctx.fieldName}', $event)" class="min-h-[200px] rounded-md border border-(--ui-border)">`,
        `        <template #default="{ editor }">`,
        `          <UEditorToolbar :editor="editor" :items="toolbarItems" />`,
        `        </template>`,
        `      </UEditor>`,
        `    </UFormField>`,
      ].join("\n");
    },
  },

  number: {
    label: "Число (number)",
    zodType: "z.number()",
    tsType: "number",
    defaultValue: "0",
    vueTemplate: (ctx) => {
      const m = ctx.modelPrefix ?? "model";
      const u = ctx.updateFn ?? "set";
      return `    ${formFieldOpen(ctx)}\n      <UInput :model-value="${m}.${ctx.fieldName}" @update:model-value="${u}('${ctx.fieldName}', Number($event))" type="number" />\n    </UFormField>`;
    },
  },

  boolean: {
    label: "Переключатель (boolean)",
    zodType: "z.boolean()",
    tsType: "boolean",
    defaultValue: "false",
    vueTemplate: (ctx) => {
      const m = ctx.modelPrefix ?? "model";
      const u = ctx.updateFn ?? "set";
      // Boolean always has a value (true/false), so never show required asterisk
      const boolCtx = { ...ctx, required: false };
      return `    ${formFieldOpen(boolCtx)}\n      <USwitch :model-value="${m}.${ctx.fieldName}" @update:model-value="${u}('${ctx.fieldName}', $event)" />\n    </UFormField>`;
    },
  },

  url: {
    label: "URL-ссылка",
    zodType: 'z.union([z.string().url(), z.literal("")])',
    tsType: "string",
    defaultValue: '""',
    vueTemplate: (ctx) => {
      const m = ctx.modelPrefix ?? "model";
      const u = ctx.updateFn ?? "set";
      return `    ${formFieldOpen(ctx)}\n      <UInput :model-value="${m}.${ctx.fieldName}" @update:model-value="${u}('${ctx.fieldName}', $event)" type="url" placeholder="https://..." />\n    </UFormField>`;
    },
  },

  image: {
    label: "Изображение (image URL)",
    zodType: "z.string().url()",
    tsType: "string | null",
    defaultValue: "null",
    nullableWhenOptional: true,
    vueTemplate: (ctx) => {
      const m = ctx.modelPrefix ?? "model";
      const u = ctx.updateFn ?? "set";
      return `    ${formFieldOpen(ctx)}\n      <ImageUpload :model-value="${m}.${ctx.fieldName}" @update:model-value="${u}('${ctx.fieldName}', $event)" folder="blocks" />\n    </UFormField>`;
    },
  },

  images: {
    label: "Галерея изображений (array of URLs)",
    zodType: "z.array(z.string().url())",
    tsType: "string[]",
    defaultValue: "[]",
    vueTemplate: (ctx) => {
      const m = ctx.modelPrefix ?? "model";
      const u = ctx.updateFn ?? "set";
      return `    ${formFieldOpen(ctx)}\n      <GalleryUpload :model-value="${m}.${ctx.fieldName}" @update:model-value="${u}('${ctx.fieldName}', $event)" />\n    </UFormField>`;
    },
  },

  strings: {
    label: "Список строк (array of strings)",
    zodType: "z.array(z.string())",
    tsType: "string[]",
    defaultValue: "[]",
    vueTemplate: (ctx) => {
      const m = ctx.modelPrefix ?? "model";
      const u = ctx.updateFn ?? "set";
      return `    ${formFieldOpen(ctx)}\n      <TagInput :model-value="${m}.${ctx.fieldName}" @update:model-value="${u}('${ctx.fieldName}', $event)" />\n    </UFormField>`;
    },
  },

  select: {
    label: "Выбор из списка (select)",
    zodType: (options) =>
      options ? `z.enum([${options.map((o) => `"${o}"`).join(", ")}])` : "z.string()",
    tsType: "string",
    defaultValue: (options) => options ? `"${options[0]}"` : '""',
    vueTemplate: (ctx) => {
      const m = ctx.modelPrefix ?? "model";
      const u = ctx.updateFn ?? "set";
      const items = ctx.options
        ? `[${ctx.options.map((o) => `{ label: "${o}", value: "${o}" }`).join(", ")}]`
        : "[]";
      return `    ${formFieldOpen(ctx)}\n      <USelect :model-value="${m}.${ctx.fieldName}" @update:model-value="${u}('${ctx.fieldName}', $event)" class="w-full" :items="${items.replace(/"/g, "'")}" />\n    </UFormField>`;
    },
  },

  repeater: {
    label: "Повторяемый блок (repeater)",
    zodType: "z.array(z.object({}))",
    tsType: "Array<Record<string, unknown>>",
    defaultValue: "[]",
    vueTemplate: () => "",
  },
};
