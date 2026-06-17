import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";
import { integrations } from "./integrations";
import { sections } from "./sections";
import { buildings } from "./buildings";

export const entrances = pgTable("entrances", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  floorsCount: integer("floors_count"),
  sectionId: text("section_id").references(() => sections.id, {
    onDelete: "cascade",
  }),
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

export const entrancesRelations = relations(entrances, ({ one }) => ({
  site: one(sites, {
    fields: [entrances.siteId],
    references: [sites.id],
  }),
  section: one(sections, {
    fields: [entrances.sectionId],
    references: [sections.id],
  }),
  building: one(buildings, {
    fields: [entrances.buildingId],
    references: [buildings.id],
  }),
  integration: one(integrations, {
    fields: [entrances.integrationId],
    references: [integrations.id],
  }),
}));
