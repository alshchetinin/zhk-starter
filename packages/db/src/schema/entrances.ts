import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { integrations } from "./integrations";
import { sections } from "./sections";
import { buildings } from "./buildings";

export const entrances = pgTable("entrances", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .default("default")
    .references(() => tenants.id),
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
  tenant: one(tenants, {
    fields: [entrances.tenantId],
    references: [tenants.id],
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
