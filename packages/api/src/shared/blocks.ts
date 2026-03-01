import { z } from "zod";

// --- Base block schema ---

const baseBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
});

// --- Editor block ---

export const editorBlockDataSchema = z.object({
  content: z.string(),
});

export const editorBlockSchema = baseBlockSchema.extend({
  type: z.literal("editor"),
  data: editorBlockDataSchema,
});

// --- Изображение block ---

export const imageBlockDataSchema = z.object({
  url: z.string().url().nullable(),
  alt: z.string(),
  caption: z.string(),
});

export const imageBlockSchema = baseBlockSchema.extend({
  type: z.literal("image"),
  data: imageBlockDataSchema,
});

// --- Цитата block ---

export const queteBlockDataSchema = z.object({
  text: z.string(),
  name: z.string(),
});

export const queteBlockSchema = baseBlockSchema.extend({
  type: z.literal("quete"),
  data: queteBlockDataSchema,
});

// --- Тест всех полей block ---

export const testAllFieldsBlockDataSchema = z.object({
  title: z.string(),
  description: z.string(),
  content: z.string(),
  count: z.number(),
  isActive: z.boolean(),
  link: z.union([z.string().url(), z.literal("")]),
  cover: z.string().url().nullable(),
  gallery: z.array(z.string().url()),
  variant: z.enum(["small", "medium", "large"]),
});

export const testAllFieldsBlockSchema = baseBlockSchema.extend({
  type: z.literal("test-all-fields"),
  data: testAllFieldsBlockDataSchema,
});

// --- GENERATOR:BLOCK_SCHEMA ---

// --- Discriminated union of all blocks ---

export const contentBlockSchema = z.discriminatedUnion("type", [
  editorBlockSchema,
  imageBlockSchema,
  queteBlockSchema,
  testAllFieldsBlockSchema,
  // --- GENERATOR:UNION_MEMBER ---
]);

export type ContentBlock = z.infer<typeof contentBlockSchema>;

export const contentBlocksSchema = z.array(contentBlockSchema);

// --- Block definitions for admin UI picker ---

export type BlockType = ContentBlock["type"];

export interface BlockDefinition {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
}

export const blockDefinitions: BlockDefinition[] = [
  {
    type: "editor",
    label: "Текстовый редактор",
    icon: "i-tabler-writing",
    description: "Форматированный текст с заголовками, списками, ссылками",
  },
  {
    type: "image",
    label: "Изображение",
    icon: "i-tabler-photo",
    description: "Одиночное изображение с подписью и alt-текстом",
  },
  {
    type: "quete",
    label: "Цитата",
    icon: "i-tabler-",
    description: "Блок с цитатой",
  },
  {
    type: "test-all-fields",
    label: "Тест всех полей",
    icon: "i-tabler-test-pipe",
    description: "Тестовый блок для проверки всех типов полей",
  },
  // --- GENERATOR:BLOCK_DEFINITION ---
];
