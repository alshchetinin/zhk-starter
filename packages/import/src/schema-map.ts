import {
  cities,
  tags,
  decorations,
  promotions,
  projects,
  buildings,
  sections,
  entrances,
  floors,
  apartmentLayouts,
  apartmentLayoutTags,
  apartments,
  nonResidentialFloors,
  commerce,
  parking,
  storage,
  apartmentPromotions,
} from "@zhk/db/schema";

/**
 * Maps logical import table names to Drizzle table objects.
 */
export const schemaMap = {
  cities,
  tags,
  decorations,
  promotions,
  projects,
  buildings,
  sections,
  entrances,
  floors,
  apartment_layouts: apartmentLayouts,
  apartment_layout_tags: apartmentLayoutTags,
  apartments,
  non_residential_floors: nonResidentialFloors,
  commerce,
  parking,
  storage,
  apartment_promotions: apartmentPromotions,
} as const;

export type ImportTableName = keyof typeof schemaMap;
