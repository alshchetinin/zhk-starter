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

// --- Главный баннер block ---

export const heroBlockDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  images: z.array(z.string().url()).min(1),
  primaryButtonText: z.string().min(1),
  primaryButtonUrl: z.union([z.string().url(), z.literal("")]),
  secondaryButtonText: z.string().optional(),
  secondaryButtonUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

export const heroBlockSchema = baseBlockSchema.extend({
  type: z.literal("hero"),
  data: heroBlockDataSchema,
});

// --- О проекте (табы) block ---

export const aboutTabsBlockDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  tabs: z.array(z.object({
    label: z.string().min(1),
    image: z.string().url(),
    subtitle: z.string().min(1),
    text: z.string().optional(),
  })).min(2),
});

export const aboutTabsBlockSchema = baseBlockSchema.extend({
  type: z.literal("about-tabs"),
  data: aboutTabsBlockDataSchema,
});

// --- О проекте (карточки) block ---

export const aboutCardsBlockDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(z.object({
    title: z.string().min(1),
    image: z.string().url(),
  })).min(3),
});

export const aboutCardsBlockSchema = baseBlockSchema.extend({
  type: z.literal("about-cards"),
  data: aboutCardsBlockDataSchema,
});

// --- Контакты block ---

export const contactsBlockDataSchema = z.object({
  title: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().min(1),
  address: z.string().min(1),
  buttonText: z.string().optional(),
  buttonUrl: z.union([z.string().url(), z.literal("")]).optional(),
  departments: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().optional(),
  })).optional(),
});

export const contactsBlockSchema = baseBlockSchema.extend({
  type: z.literal("contacts"),
  data: contactsBlockDataSchema,
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
  heroBlockSchema,
  aboutTabsBlockSchema,
  aboutCardsBlockSchema,
  contactsBlockSchema,
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
  {
    type: "hero",
    label: "Главный баннер",
    icon: "i-tabler-photo",
    description: "Fullscreen баннер проекта с фоном-слайдером и CTA",
  },
  {
    type: "about-tabs",
    label: "О проекте (табы)",
    icon: "i-tabler-layout-bottombar",
    description: "Секция о проекте с табами: картинка-слайдер, подзаголовок, описание",
  },
  {
    type: "about-cards",
    label: "О проекте (карточки)",
    icon: "i-tabler-cards",
    description: "Секция с большим заголовком, описанием и карточками с изображениями",
  },
  {
    type: "contacts",
    label: "Контакты",
    icon: "i-tabler-address-book",
    description: "Блок контактов с телефоном, email, адресом, отделами и картой",
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
