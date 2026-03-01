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

// --- Команда block ---

export const teamBlockDataSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    picture: z.string().url(),
  })).min(4),
});

export const teamBlockSchema = baseBlockSchema.extend({
  type: z.literal("team"),
  data: teamBlockDataSchema,
});

// --- Карточки block ---

export const cardV1BlockDataSchema = z.object({
  items: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    image: z.string().url(),
  })).min(3).max(3),
});

export const cardV1BlockSchema = baseBlockSchema.extend({
  type: z.literal("card-v1"),
  data: cardV1BlockDataSchema,
});

// --- GENERATOR:BLOCK_SCHEMA ---

// --- Discriminated union of all blocks ---

export const contentBlockSchema = z.discriminatedUnion("type", [
  allFieldsBlockSchema,
  featuresBlockSchema,
  teamBlockSchema,
  cardV1BlockSchema,
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
  {
    type: "team",
    label: "Команда",
    icon: "i-tabler-ghost-3",
    description: "Блок с карточками",
  },
  {
    type: "card-v1",
    label: "Карточки",
    icon: "i-tabler-ghost-3",
    description: "Карточки с описанием и картинкой",
  },
  // --- GENERATOR:BLOCK_DEFINITION ---
];
