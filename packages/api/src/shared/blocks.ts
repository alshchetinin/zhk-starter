import { z } from "zod";

// --- Base block schema ---

const baseBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
});

// --- Все типы полей block ---

export const allFieldsBlockDataSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  body: z.string().min(1),
  note: z.string().optional(),
  content: z.string().min(1),
  sortOrder: z.number().optional(),
  isVisible: z.boolean(),
  link: z.union([z.string().url(), z.literal("")]).optional(),
  cover: z.string().url(),
  gallery: z.array(z.string().url()).optional(),
  size: z.enum(["small", "medium", "large"]),
});

export const allFieldsBlockSchema = baseBlockSchema.extend({
  type: z.literal("all-fields"),
  data: allFieldsBlockDataSchema,
});

// --- Перимущества block ---

export const featuresBlockDataSchema = z.object({
  name: z.string().min(1),
  picture: z.string().url(),
});

export const featuresBlockSchema = baseBlockSchema.extend({
  type: z.literal("features"),
  data: featuresBlockDataSchema,
});

// --- GENERATOR:BLOCK_SCHEMA ---

// --- Discriminated union of all blocks ---

export const contentBlockSchema = z.discriminatedUnion("type", [
  allFieldsBlockSchema,
  featuresBlockSchema,
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
    type: "all-fields",
    label: "Все типы полей",
    icon: "i-tabler-layout-list",
    description: "Блок со всеми типами полей для тестирования",
  },
  {
    type: "features",
    label: "Перимущества",
    icon: "i-tabler-ghost-3",
    description: "Карточки преимущести",
  },
  // --- GENERATOR:BLOCK_DEFINITION ---
];
