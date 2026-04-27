import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";
import { integrations } from "./integrations";
import { buildings } from "./buildings";
import { floors } from "./floors";
import { entrances } from "./entrances";

export const sections = pgTable("sections", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id),
  buildingId: text("building_id").references(() => buildings.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  floorsCount: integer("floors_count"),
  sunPosition: integer("sun_position"),
  masterplanImage: text("masterplan_image"),
  masterplanScheme: text("masterplan_scheme"),
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

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  site: one(sites, {
    fields: [sections.siteId],
    references: [sites.id],
  }),
  building: one(buildings, {
    fields: [sections.buildingId],
    references: [buildings.id],
  }),
  integration: one(integrations, {
    fields: [sections.integrationId],
    references: [integrations.id],
  }),
  floors: many(floors),
  entrances: many(entrances),
}));
