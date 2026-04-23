import { z } from "zod";

// --- Base block schema ---

const baseBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
});

// --- О проекте block ---

export const aboutProjectBlockDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  tabs: z.array(z.object({
    label: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    images: z.array(z.string().url()),
  })).min(2).max(6),
});

export const aboutProjectBlockSchema = baseBlockSchema.extend({
  type: z.literal("about-project"),
  data: aboutProjectBlockDataSchema,
});

// --- Карточки о проекте block ---

export const aboutFeaturesBlockDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  items: z.array(z.object({
    title: z.string().min(1),
    image: z.string().url(),
  })).min(2).max(6),
});

export const aboutFeaturesBlockSchema = baseBlockSchema.extend({
  type: z.literal("about-features"),
  data: aboutFeaturesBlockDataSchema,
});

// --- Контакты block ---

export const contactsOfficeBlockDataSchema = z.object({
  title: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().min(1),
  address: z.string().min(1),
  mapCoordinates: z.string().optional(),
  buttonLabel: z.string().optional(),
  buttonUrl: z.union([z.string().url(), z.literal("")]).optional(),
  socials: z.array(z.object({
    type: z.enum(["telegram", "whatsapp", "vk"]),
    url: z.union([z.string().url(), z.literal("")]),
  })).min(1).max(5).optional(),
  departments: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().min(1),
  })).min(1).max(8),
});

export const contactsOfficeBlockSchema = baseBlockSchema.extend({
  type: z.literal("contacts-office"),
  data: contactsOfficeBlockDataSchema,
});

// --- Hero на весь экран block ---

export const heroFullscreenBlockDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  images: z.array(z.string().url()),
  address: z.string().min(1),
  district: z.string().optional(),
  walkTime: z.string().optional(),
  driveTime: z.string().optional(),
  buildings: z.array(z.object({
    label: z.string().min(1),
    date: z.string().min(1),
  })).min(1).max(6),
  primaryButtonLabel: z.string().optional(),
  primaryButtonUrl: z.union([z.string().url(), z.literal("")]).optional(),
  secondaryButtonLabel: z.string().optional(),
  secondaryButtonUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

export const heroFullscreenBlockSchema = baseBlockSchema.extend({
  type: z.literal("hero-fullscreen"),
  data: heroFullscreenBlockDataSchema,
});

// --- Инфраструктура block ---

export const infrastructureTabsBlockDataSchema = z.object({
  subtitle: z.string().optional(),
  title: z.string().min(1),
  tabs: z.array(z.object({
    label: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    image: z.string().url(),
  })).min(2).max(8),
});

export const infrastructureTabsBlockSchema = baseBlockSchema.extend({
  type: z.literal("infrastructure-tabs"),
  data: infrastructureTabsBlockDataSchema,
});

// --- О компании block ---

export const aboutCompanyBlockDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  buttonLabel: z.string().optional(),
  buttonUrl: z.union([z.string().url(), z.literal("")]).optional(),
  image: z.string().url(),
  stats: z.array(z.object({
    value: z.string().min(1),
    label: z.string().min(1),
  })).min(2).max(6),
});

export const aboutCompanyBlockSchema = baseBlockSchema.extend({
  type: z.literal("about-company"),
  data: aboutCompanyBlockDataSchema,
});

// --- Команда block ---

export const temasBlockDataSchema = z.object({
  title: z.string().min(1),
  member: z.array(z.object({
    name: z.string().min(1),
    avatar: z.string().url(),
  })).min(2).max(4),
});

export const temasBlockSchema = baseBlockSchema.extend({
  type: z.literal("temas"),
  data: temasBlockDataSchema,
});

// --- Карьера block ---

export const careerBlockDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  buttonLabel: z.string().optional(),
  buttonUrl: z.union([z.string().url(), z.literal("")]).optional(),
  vacancies: z.array(z.object({
    title: z.string().min(1),
    location: z.string().min(1),
    company: z.string().min(1),
    url: z.union([z.string().url(), z.literal("")]).optional(),
  })).min(1).max(12),
});

export const careerBlockSchema = baseBlockSchema.extend({
  type: z.literal("career"),
  data: careerBlockDataSchema,
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

// --- Инфраструктура на карте block ---

export const projectInfrastructureBlockDataSchema = projectBlockBase.extend({
  mapHeight: z.number().default(500),
  showCategories: z.boolean().default(true),
});

export const projectInfrastructureBlockSchema = baseBlockSchema.extend({
  type: z.literal("project-infrastructure"),
  data: projectInfrastructureBlockDataSchema,
});

// --- Discriminated union of all blocks ---

export const contentBlockSchema = z.discriminatedUnion("type", [
  aboutProjectBlockSchema,
  aboutFeaturesBlockSchema,
  contactsOfficeBlockSchema,
  heroFullscreenBlockSchema,
  infrastructureTabsBlockSchema,
  aboutCompanyBlockSchema,
  temasBlockSchema,
  careerBlockSchema,
  // --- GENERATOR:UNION_MEMBER ---
  projectGalleryBlockSchema,
  projectStatsBlockSchema,
  projectLocationBlockSchema,
  projectInfrastructureBlockSchema,
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
    type: "about-project",
    label: "О проекте",
    icon: "i-tabler-building",
    description: "Секция о проекте с табами и слайдером изображений",
  },
  {
    type: "about-features",
    label: "Карточки о проекте",
    icon: "i-tabler-layout-grid",
    description: "Секция с карточками-преимуществами проекта с изображениями",
  },
  {
    type: "contacts-office",
    label: "Контакты",
    icon: "i-tabler-address-book",
    description: "Секция контактов с адресом, картой, отделами и соцсетями",
  },
  {
    type: "hero-fullscreen",
    label: "Hero на весь экран",
    icon: "i-tabler-photo",
    description: "Полноэкранный hero-блок со слайдером, адресом и сроками сдачи",
  },
  {
    type: "infrastructure-tabs",
    label: "Инфраструктура",
    icon: "i-tabler-trees",
    description: "Секция инфраструктуры с табами и изображениями",
  },
  {
    type: "about-company",
    label: "О компании",
    icon: "i-tabler-building-estate",
    description: "Секция о компании с описанием, изображением и статистикой",
  },
  {
    type: "temas",
    label: "Команда",
    icon: "i-tabler-ghost-3",
    description: "Блок с командой",
  },
  {
    type: "career",
    label: "Карьера",
    icon: "i-tabler-briefcase",
    description: "Секция с вакансиями компании",
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
  {
    type: "project-infrastructure",
    label: "Инфраструктура на карте",
    icon: "i-tabler-map-2",
    description: "Карта инфраструктуры проекта с пинами по категориям",
    category: "project",
  },
];
