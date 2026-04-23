export interface CollectionFieldType {
  label: string;
  drizzleImport: string;
  drizzleColumn: (name: string, snakeName: string, required: boolean) => string;
  zodCreateType: (required: boolean) => string;
  zodUpdateType: string;
  formTemplate: (name: string, label: string, required: boolean) => string;
  tsDefault: string;
  /** Skip "required?" prompt — type always has a default */
  alwaysOptional?: boolean;
}

function formField(
  _name: string,
  label: string,
  required: boolean,
  inner: string,
): string {
  const req = required ? " required" : "";
  return `          <UFormField label="${label}"${req}>\n${inner}\n          </UFormField>`;
}

export const COLLECTION_FIELD_TYPES: Record<string, CollectionFieldType> = {
  string: {
    label: "Строка (text)",
    drizzleImport: "text",
    drizzleColumn: (name, snake, req) =>
      req
        ? `  ${name}: text("${snake}").notNull(),`
        : `  ${name}: text("${snake}"),`,
    zodCreateType: (req) =>
      req ? "z.string().min(1)" : "z.string().optional()",
    zodUpdateType: "z.string().nullable().optional()",
    formTemplate: (name, label, req) =>
      formField(name, label, req, `            <UInput v-model="form.${name}" />`),
    tsDefault: '""',
  },

  textarea: {
    label: "Многострочный текст (textarea)",
    drizzleImport: "text",
    drizzleColumn: (name, snake, req) =>
      req
        ? `  ${name}: text("${snake}").notNull(),`
        : `  ${name}: text("${snake}"),`,
    zodCreateType: (req) =>
      req ? "z.string().min(1)" : "z.string().optional()",
    zodUpdateType: "z.string().nullable().optional()",
    formTemplate: (name, label, req) =>
      formField(name, label, req, `            <UTextarea v-model="form.${name}" :rows="4" />`),
    tsDefault: '""',
  },

  number: {
    label: "Число (integer)",
    drizzleImport: "integer",
    drizzleColumn: (name, snake, req) =>
      req
        ? `  ${name}: integer("${snake}").notNull(),`
        : `  ${name}: integer("${snake}"),`,
    zodCreateType: (req) =>
      req ? "z.number().int()" : "z.number().int().optional()",
    zodUpdateType: "z.number().int().optional()",
    formTemplate: (name, label, req) =>
      formField(name, label, req, `            <UInput v-model.number="form.${name}" type="number" />`),
    tsDefault: "0",
  },

  boolean: {
    label: "Переключатель (boolean)",
    drizzleImport: "boolean",
    alwaysOptional: true,
    drizzleColumn: (name, snake) =>
      `  ${name}: boolean("${snake}").notNull().default(false),`,
    zodCreateType: () => "z.boolean().default(false)",
    zodUpdateType: "z.boolean().optional()",
    formTemplate: (name, label) =>
      formField(name, label, false, `            <USwitch v-model="form.${name}" />`),
    tsDefault: "false",
  },

  image: {
    label: "Изображение (URL)",
    drizzleImport: "text",
    drizzleColumn: (name, snake, req) =>
      req
        ? `  ${name}: text("${snake}").notNull(),`
        : `  ${name}: text("${snake}"),`,
    zodCreateType: (req) =>
      req ? "z.string().url()" : "z.string().url().optional()",
    zodUpdateType: "z.string().nullable().optional()",
    formTemplate: (name, label, req) =>
      formField(name, label, req, `            <ImageUpload v-model="form.${name}" folder="uploads" />`),
    tsDefault: "null as string | null",
  },

  images: {
    label: "Галерея (массив URL)",
    drizzleImport: "jsonb",
    alwaysOptional: true,
    drizzleColumn: (name, snake) =>
      `  ${name}: jsonb("${snake}").$type<string[]>().default([]),`,
    zodCreateType: () => "z.array(z.string().url()).default([])",
    zodUpdateType: "z.array(z.string().url()).optional()",
    formTemplate: (name, label) =>
      formField(name, label, false, `            <GalleryUpload v-model="form.${name}" />`),
    tsDefault: "[] as string[]",
  },

  "dynamic-blocks": {
    label: "Динамические блоки (контент-блоки)",
    drizzleImport: "jsonb",
    alwaysOptional: true,
    drizzleColumn: (name, snake) =>
      `  ${name}: jsonb("${snake}").$type<ContentBlock[]>().default([]),`,
    zodCreateType: () => "contentBlocksSchema.default([])",
    zodUpdateType: "contentBlocksSchema.optional()",
    formTemplate: (name, label) =>
      `          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">\n            <h3 class="text-lg font-semibold mb-4">${label}</h3>\n            <BlockDynamicZone v-model="form.${name}" />\n          </div>`,
    tsDefault: "[] as ContentBlock[]",
  },
};

export const fieldTypeOptions = Object.entries(COLLECTION_FIELD_TYPES).map(
  ([key, ft]) => ({
    value: key,
    label: ft.label,
  }),
);
