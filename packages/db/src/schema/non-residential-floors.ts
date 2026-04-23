import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";
import { integrations } from "./integrations";
import { projects } from "./projects";
import { buildings } from "./buildings";

export const nonResidentialFloors = pgTable("non_residential_floors", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id),
  floorNumber: integer("floor_number"),
  floorImage: text("floor_image"),
  svgScheme: text("svg_scheme"),
  projectId: text("project_id").references(() => projects.id),
  buildingId: text("building_id").references(() => buildings.id),
  externalId: text("external_id"),
  integrationId: text("integration_id").references(() => integrations.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const nonResidentialFloorsRelations = relations(
  nonResidentialFloors,
  ({ one }) => ({
    site: one(sites, {
      fields: [nonResidentialFloors.siteId],
      references: [sites.id],
    }),
    project: one(projects, {
      fields: [nonResidentialFloors.projectId],
      references: [projects.id],
    }),
    building: one(buildings, {
      fields: [nonResidentialFloors.buildingId],
      references: [buildings.id],
    }),
    integration: one(integrations, {
      fields: [nonResidentialFloors.integrationId],
      references: [integrations.id],
    }),
  }),
);
