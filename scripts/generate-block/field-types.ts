export interface FieldType {
  label: string;
  zodType: string | ((options?: string[]) => string);
  tsType: string;
  defaultValue: string | ((options?: string[]) => string);
  vueTemplate: (fieldName: string, label: string, options?: string[]) => string;
  needsEditorSetup?: boolean;
}

export const FIELD_TYPES: Record<string, FieldType> = {
  string: {
    label: "Строка (string)",
    zodType: "z.string()",
    tsType: "string",
    defaultValue: '""',
    vueTemplate: (name, label) =>
      `    <UFormField label="${label}">\n      <UInput v-model="model.${name}" />\n    </UFormField>`,
  },

  text: {
    label: "Многострочный текст (textarea)",
    zodType: "z.string()",
    tsType: "string",
    defaultValue: '""',
    vueTemplate: (name, label) =>
      `    <UFormField label="${label}">\n      <UTextarea v-model="model.${name}" :rows="4" />\n    </UFormField>`,
  },

  richtext: {
    label: "Форматированный текст (rich text)",
    zodType: "z.string()",
    tsType: "string",
    defaultValue: '""',
    needsEditorSetup: true,
    vueTemplate: (name, label) =>
      [
        `    <UFormField label="${label}">`,
        `      <UEditor v-model="model.${name}" class="min-h-[200px] rounded-md border border-(--ui-border)">`,
        `        <template #default="{ editor }">`,
        `          <UEditorToolbar :editor="editor" :items="toolbarItems" />`,
        `        </template>`,
        `      </UEditor>`,
        `    </UFormField>`,
      ].join("\n"),
  },

  number: {
    label: "Число (number)",
    zodType: "z.number()",
    tsType: "number",
    defaultValue: "0",
    vueTemplate: (name, label) =>
      `    <UFormField label="${label}">\n      <UInput v-model.number="model.${name}" type="number" />\n    </UFormField>`,
  },

  boolean: {
    label: "Переключатель (boolean)",
    zodType: "z.boolean()",
    tsType: "boolean",
    defaultValue: "false",
    vueTemplate: (name, label) =>
      `    <UFormField label="${label}">\n      <USwitch v-model="model.${name}" />\n    </UFormField>`,
  },

  url: {
    label: "URL-ссылка",
    zodType: 'z.union([z.string().url(), z.literal("")])',
    tsType: "string",
    defaultValue: '""',
    vueTemplate: (name, label) =>
      `    <UFormField label="${label}">\n      <UInput v-model="model.${name}" type="url" placeholder="https://..." />\n    </UFormField>`,
  },

  image: {
    label: "Изображение (image URL)",
    zodType: "z.string().url().nullable()",
    tsType: "string | null",
    defaultValue: "null",
    vueTemplate: (name, label) =>
      `    <UFormField label="${label}">\n      <ImageUpload v-model="model.${name}" folder="blocks" />\n    </UFormField>`,
  },

  images: {
    label: "Галерея изображений (array of URLs)",
    zodType: "z.array(z.string().url())",
    tsType: "string[]",
    defaultValue: "[]",
    vueTemplate: (name, label) =>
      `    <UFormField label="${label}">\n      <GalleryUpload v-model="model.${name}" />\n    </UFormField>`,
  },

  select: {
    label: "Выбор из списка (select)",
    zodType: (options) =>
      options ? `z.enum([${options.map((o) => `"${o}"`).join(", ")}])` : "z.string()",
    tsType: "string",
    defaultValue: (options) => options ? `"${options[0]}"` : '""',
    vueTemplate: (name, label, options) => {
      const items = options
        ? `[${options.map((o) => `{ label: "${o}", value: "${o}" }`).join(", ")}]`
        : "[]";
      return `    <UFormField label="${label}">\n      <USelect v-model="model.${name}" class="w-full" :items="${items.replace(/"/g, "'")}" />\n    </UFormField>`;
    },
  },
};
