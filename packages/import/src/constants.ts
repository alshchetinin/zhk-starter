import type { ImportTableName } from "./schema-map";
import type { RelationMapping } from "./types";

/**
 * Topological order for import (respects FK dependencies).
 * Delete runs in reverse order.
 */
export const IMPORT_ORDER: ImportTableName[] = [
  "cities",
  "tags",
  "decorations",
  "promotions",
  "projects",
  "buildings",
  "sections",
  "entrances",
  "floors",
  "apartment_layouts",
  "apartment_layout_tags",
  "apartments",
  "non_residential_floors",
  "commerce",
  "parking",
  "storage",
  "apartment_promotions",
];

/**
 * FK relation mappings for each table.
 * Defines how external_* fields are resolved to real DB ids.
 */
export const RELATIONS_MAP: Partial<
  Record<ImportTableName, RelationMapping[]>
> = {
  projects: [
    {
      sourceKey: "external_city_id",
      lookupTable: "cities",
      targetColumn: "cityId",
    },
  ],
  buildings: [
    {
      sourceKey: "external_project_id",
      lookupTable: "projects",
      targetColumn: "projectId",
    },
  ],
  sections: [
    {
      sourceKey: "external_building_id",
      lookupTable: "buildings",
      targetColumn: "buildingId",
    },
  ],
  entrances: [
    {
      sourceKey: "external_section_id",
      lookupTable: "sections",
      targetColumn: "sectionId",
    },
    {
      sourceKey: "external_building_id",
      lookupTable: "buildings",
      targetColumn: "buildingId",
    },
  ],
  floors: [
    {
      sourceKey: "external_section_id",
      lookupTable: "sections",
      targetColumn: "sectionId",
    },
    {
      sourceKey: "external_entrance_id",
      lookupTable: "entrances",
      targetColumn: "entranceId",
    },
  ],
  apartment_layout_tags: [
    {
      sourceKey: "external_layout_id",
      lookupTable: "apartment_layouts",
      targetColumn: "layoutId",
    },
    {
      sourceKey: "tag_name",
      lookupTable: "tags",
      lookupColumn: "name",
      targetColumn: "tagId",
    },
  ],
  apartments: [
    {
      sourceKey: "external_project_id",
      lookupTable: "projects",
      targetColumn: "projectId",
    },
    {
      sourceKey: "external_building_id",
      lookupTable: "buildings",
      targetColumn: "buildingId",
    },
    {
      sourceKey: "external_section_id",
      lookupTable: "sections",
      targetColumn: "sectionId",
    },
    {
      sourceKey: "external_entrance_id",
      lookupTable: "entrances",
      targetColumn: "entranceId",
    },
    {
      sourceKey: "external_floor_id",
      lookupTable: "floors",
      targetColumn: "floorId",
    },
    {
      sourceKey: "external_apartment_layout_id",
      lookupTable: "apartment_layouts",
      targetColumn: "apartmentLayoutId",
    },
    {
      sourceKey: "external_decoration_id",
      lookupTable: "decorations",
      targetColumn: "decorationId",
    },
  ],
  non_residential_floors: [
    {
      sourceKey: "external_project_id",
      lookupTable: "projects",
      targetColumn: "projectId",
    },
    {
      sourceKey: "external_building_id",
      lookupTable: "buildings",
      targetColumn: "buildingId",
    },
  ],
  commerce: [
    {
      sourceKey: "external_project_id",
      lookupTable: "projects",
      targetColumn: "projectId",
    },
    {
      sourceKey: "external_building_id",
      lookupTable: "buildings",
      targetColumn: "buildingId",
    },
    {
      sourceKey: "external_floor_id",
      lookupTable: "non_residential_floors",
      targetColumn: "floorId",
    },
  ],
  parking: [
    {
      sourceKey: "external_project_id",
      lookupTable: "projects",
      targetColumn: "projectId",
    },
    {
      sourceKey: "external_building_id",
      lookupTable: "buildings",
      targetColumn: "buildingId",
    },
    {
      sourceKey: "external_floor_id",
      lookupTable: "non_residential_floors",
      targetColumn: "floorId",
    },
  ],
  storage: [
    {
      sourceKey: "external_project_id",
      lookupTable: "projects",
      targetColumn: "projectId",
    },
    {
      sourceKey: "external_building_id",
      lookupTable: "buildings",
      targetColumn: "buildingId",
    },
    {
      sourceKey: "external_floor_id",
      lookupTable: "non_residential_floors",
      targetColumn: "floorId",
    },
  ],
  apartment_promotions: [
    {
      sourceKey: "external_apartment_id",
      lookupTable: "apartments",
      targetColumn: "apartmentId",
    },
    {
      sourceKey: "external_promotion_id",
      lookupTable: "promotions",
      targetColumn: "promotionId",
    },
  ],
};

/**
 * Tables that use composite keys instead of externalId for uniqueness.
 * Join tables without their own id/externalId columns.
 */
export const JOIN_TABLES: ImportTableName[] = [
  "apartment_layout_tags",
  "apartment_promotions",
];

/** Batch size for DB operations */
export const BATCH_SIZE = 100;
