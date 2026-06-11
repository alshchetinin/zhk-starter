import { z } from "zod";
import type { BlockDefinition } from "./_core";

import { aboutProjectBlock } from "./about-project";
import { aboutFeaturesBlock } from "./about-features";
import { contactsBlock } from "./contacts";
import { heroFullscreenBlock } from "./hero-fullscreen";
import { infrastructureTabsBlock } from "./infrastructure-tabs";
import { aboutCompanyBlock } from "./about-company";
import { temasBlock } from "./temas";
import { careerBlock } from "./career";
import { projectGalleryBlock } from "./project-gallery";
import { projectStatsBlock } from "./project-stats";
import { projectLocationBlock } from "./project-location";
import { projectInfrastructureBlock } from "./project-infrastructure";

export { defineBlock } from "./_core";
export type { BlockDefinition, BlockCategory, BlockField, BlockFieldType } from "./_core";

export const allBlocks = [
  aboutProjectBlock,
  aboutFeaturesBlock,
  contactsBlock,
  heroFullscreenBlock,
  infrastructureTabsBlock,
  aboutCompanyBlock,
  temasBlock,
  careerBlock,
  projectGalleryBlock,
  projectStatsBlock,
  projectLocationBlock,
  projectInfrastructureBlock,
] as const satisfies readonly BlockDefinition[];

export const contentBlockSchema = z.discriminatedUnion(
  "type",
  allBlocks.map((b) => b.schema) as unknown as [
    typeof allBlocks[number]["schema"],
    ...typeof allBlocks[number]["schema"][],
  ],
);

export const contentBlocksSchema = z.array(contentBlockSchema);

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type BlockType = ContentBlock["type"];

export interface BlockPickerEntry {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
  category?: "content" | "project";
}

export const blockDefinitions: BlockPickerEntry[] = allBlocks.map((b) => ({
  type: b.type as BlockType,
  label: b.label,
  icon: b.icon,
  description: b.description,
  category: b.category,
}));

const defaultDataByType = Object.fromEntries(
  allBlocks.map((b) => [b.type, b.defaultData]),
) as Record<BlockType, unknown>;

export function getBlockDefaultData(type: BlockType): unknown {
  return structuredClone(defaultDataByType[type]);
}

/**
 * Мержит сохранённые данные блока с defaultData: новые поля схемы получают
 * default-значения, контент в БД не мигрируется (как в Strapi).
 *
 * Мерж поверхностный: элементы repeater-массивов НЕ нормализуются (новые
 * subFields в существующих элементах отсутствуют — потребители обязаны
 * обращаться к ним опционально). Лишние/переименованные ключи в data
 * сохраняются как есть и отбрасываются только Zod-валидацией при сохранении.
 */
export function normalizeBlockData(
  type: BlockType,
  data: unknown,
): Record<string, unknown> {
  const defaults = (getBlockDefaultData(type) ?? {}) as Record<string, unknown>;
  return { ...defaults, ...((data ?? {}) as Record<string, unknown>) };
}
