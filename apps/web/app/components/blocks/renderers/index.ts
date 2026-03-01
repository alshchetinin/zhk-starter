import type { Component } from "vue";
import type { BlockType } from "@zhk/api/shared/blocks";
import AllFieldsBlock from "./AllFieldsBlock.vue";
import FeaturesBlock from "./FeaturesBlock.vue";
import TeamBlock from "./TeamBlock.vue";
import CardV1Block from "./CardV1Block.vue";
import ProjectGalleryBlock from "./ProjectGalleryBlock.vue";
import ProjectStatsBlock from "./ProjectStatsBlock.vue";
import ProjectLocationBlock from "./ProjectLocationBlock.vue";
import MapBlock from "./MapBlock.vue";
import TestBlock from "./TestBlock.vue";
// --- GENERATOR:RENDERER_COMPONENT ---

export const blockRendererComponents: Partial<Record<BlockType, Component>> = {
  "all-fields": AllFieldsBlock,
  features: FeaturesBlock,
  team: TeamBlock,
  "card-v1": CardV1Block,
  "project-gallery": ProjectGalleryBlock,
  "project-stats": ProjectStatsBlock,
  "project-location": ProjectLocationBlock,
  map: MapBlock,
  test: TestBlock,
  // --- GENERATOR:RENDERER_ENTRY ---
};
