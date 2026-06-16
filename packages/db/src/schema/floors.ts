import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";
import { integrations } from "./integrations";
import { sections } from "./sections";
import { entrances } from "./entrances";

export const floorLayouts = pgTable("floor_layouts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  layout: text("layout").notNull(),
  sectionId: text("section_id").references(() => sections.id),
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

export const floorLayoutsRelations = relations(floorLayouts, ({ one }) => ({
  site: one(sites, {
    fields: [floorLayouts.siteId],
    references: [sites.id],
  }),
  section: one(sections, {
    fields: [floorLayouts.sectionId],
    references: [sections.id],
  }),
  integration: one(integrations, {
    fields: [floorLayouts.integrationId],
    references: [integrations.id],
  }),
}));

export const floors = pgTable("floors", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  sectionId: text("section_id").references(() => sections.id, {
    onDelete: "cascade",
  }),
  entranceId: text("entrance_id").references(() => entrances.id),
  floorLayoutId: text("floor_layout_id").references(() => floorLayouts.id),
  floorNumber: integer("floor_number"),
  floorImage: text("floor_image"),
  svgScheme: text("svg_scheme"),
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

export const floorsRelations = relations(floors, ({ one }) => ({
  site: one(sites, {
    fields: [floors.siteId],
    references: [sites.id],
  }),
  section: one(sections, {
    fields: [floors.sectionId],
    references: [sections.id],
  }),
  entrance: one(entrances, {
    fields: [floors.entranceId],
    references: [entrances.id],
  }),
  floorLayout: one(floorLayouts, {
    fields: [floors.floorLayoutId],
    references: [floorLayouts.id],
  }),
  integration: one(integrations, {
    fields: [floors.integrationId],
    references: [integrations.id],
  }),
}));
