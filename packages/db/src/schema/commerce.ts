import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  numeric,
  pgTable,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { sites } from "./sites";
import { integrations } from "./integrations";
import { projects } from "./projects";
import { buildings } from "./buildings";
import { nonResidentialFloors } from "./non-residential-floors";

export const commerce = pgTable("commerce", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  name: text("name"),
  category: text("category"),
  area: numeric("area", { precision: 10, scale: 2 }),
  price: numeric("price", { precision: 12, scale: 2 }),
  oldPrice: numeric("old_price", { precision: 12, scale: 2 }),
  floorNumber: integer("floor_number"),
  completionDate: date("completion_date"),
  layoutImage: text("layout_image"),
  isPublished: boolean("is_published").default(true),
  isPopular: boolean("is_popular").default(false),
  projectId: text("project_id").references(() => projects.id),
  buildingId: text("building_id").references(() => buildings.id),
  floorId: text("floor_id").references(() => nonResidentialFloors.id),
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

export const commerceRelations = relations(commerce, ({ one }) => ({
  site: one(sites, {
    fields: [commerce.siteId],
    references: [sites.id],
  }),
  project: one(projects, {
    fields: [commerce.projectId],
    references: [projects.id],
  }),
  building: one(buildings, {
    fields: [commerce.buildingId],
    references: [buildings.id],
  }),
  floor: one(nonResidentialFloors, {
    fields: [commerce.floorId],
    references: [nonResidentialFloors.id],
  }),
  integration: one(integrations, {
    fields: [commerce.integrationId],
    references: [integrations.id],
  }),
}));
