import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { integrations } from "./integrations";
import { projects } from "./projects";

export const cities = pgTable("cities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .default("default")
    .references(() => tenants.id),
  name: text("name").notNull(),
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

export const citiesRelations = relations(cities, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [cities.tenantId],
    references: [tenants.id],
  }),
  integration: one(integrations, {
    fields: [cities.integrationId],
    references: [integrations.id],
  }),
  projects: many(projects),
}));
