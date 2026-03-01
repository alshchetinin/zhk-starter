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

// --- Карта block ---

export const mapBlockDataSchema = z.object({
  name: z.enum(["1", "2", "3", "4", "5"]),
});

export const mapBlockSchema = baseBlockSchema.extend({
  type: z.literal("map"),
  data: mapBlockDataSchema,
});

// --- тест block ---

export const testBlockDataSchema = z.object({
  name: z.string().min(1),
});

export const testBlockSchema = baseBlockSchema.extend({
  type: z.literal("test"),
  data: testBlockDataSchema,
});

// --- GENERATOR:BLOCK_SCHEMA ---

// --- Project block base ---

const projectBlockBase = z.object({
  projectId: z.string().min(1),
});

// --- Галерея проекта block ---

export const projectGalleryBlockDataSchema = projectBlockBase.extend({
  columns: z.enum(["2", "3", "4"]).default("3"),
  maxImages: z.number().optional(),
});

export const projectGalleryBlockSchema = baseBlockSchema.extend({
  type: z.literal("project-gallery"),
  data: projectGalleryBlockDataSchema,
});

// --- Статистика квартир block ---

export const projectStatsBlockDataSchema = projectBlockBase.extend({
  showFree: z.boolean().default(true),
  showTotal: z.boolean().default(true),
});

export const projectStatsBlockSchema = baseBlockSchema.extend({
  type: z.literal("project-stats"),
  data: projectStatsBlockDataSchema,
});

// --- Карта и адрес проекта block ---

export const projectLocationBlockDataSchema = projectBlockBase.extend({
  showAddress: z.boolean().default(true),
  mapHeight: z.number().default(400),
});

export const projectLocationBlockSchema = baseBlockSchema.extend({
  type: z.literal("project-location"),
  data: projectLocationBlockDataSchema,
});

// --- Discriminated union of all blocks ---

export const contentBlockSchema = z.discriminatedUnion("type", [
  allFieldsBlockSchema,
  featuresBlockSchema,
  teamBlockSchema,
  cardV1BlockSchema,
  mapBlockSchema,
  testBlockSchema,
  // --- GENERATOR:UNION_MEMBER ---
  projectGalleryBlockSchema,
  projectStatsBlockSchema,
  projectLocationBlockSchema,
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
  category?: "content" | "project";
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
  {
    type: "map",
    label: "Карта",
    icon: "i-tabler-ghost-3",
    description: "Карта яндекс",
  },
  {
    type: "test",
    label: "тест",
    icon: "i-tabler-ghost-3",
    description: "тест",
  },
  // --- GENERATOR:BLOCK_DEFINITION ---
  {
    type: "project-gallery",
    label: "Галерея проекта",
    icon: "i-tabler-photo",
    description: "Галерея изображений из проекта",
    category: "project",
  },
  {
    type: "project-stats",
    label: "Статистика квартир",
    icon: "i-tabler-chart-bar",
    description: "Количество свободных и общее число квартир",
    category: "project",
  },
  {
    type: "project-location",
    label: "Карта и адрес",
    icon: "i-tabler-map-pin",
    description: "Карта и адрес проекта",
    category: "project",
  },
];
