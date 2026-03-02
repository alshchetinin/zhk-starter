import type { Component } from "vue";
import type { BlockType } from "@zhk/api/shared/blocks";
import ProjectGalleryBlock from "./ProjectGalleryBlock.vue";
import ProjectStatsBlock from "./ProjectStatsBlock.vue";
import ProjectLocationBlock from "./ProjectLocationBlock.vue";
import AboutProjectBlock from "./AboutProjectBlock.vue";
import AboutFeaturesBlock from "./AboutFeaturesBlock.vue";
import ContactsOfficeBlock from "./ContactsOfficeBlock.vue";
import HeroFullscreenBlock from "./HeroFullscreenBlock.vue";
import InfrastructureTabsBlock from "./InfrastructureTabsBlock.vue";
import ProjectInfrastructureBlock from "./ProjectInfrastructureBlock.vue";
import AboutCompanyBlock from "./AboutCompanyBlock.vue";
// --- GENERATOR:RENDERER_COMPONENT ---

export const blockRendererComponents: Partial<Record<BlockType, Component>> = {
  "project-gallery": ProjectGalleryBlock,
  "project-stats": ProjectStatsBlock,
  "project-location": ProjectLocationBlock,
  "about-project": AboutProjectBlock,
  "about-features": AboutFeaturesBlock,
  "contacts-office": ContactsOfficeBlock,
  "hero-fullscreen": HeroFullscreenBlock,
  "infrastructure-tabs": InfrastructureTabsBlock,
  "project-infrastructure": ProjectInfrastructureBlock,
  "about-company": AboutCompanyBlock,
  // --- GENERATOR:RENDERER_ENTRY ---
};
