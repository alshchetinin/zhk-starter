import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { integrations } from "./integrations";
import { projects } from "./projects";

export const cities = pgTable("cities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
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
  integration: one(integrations, {
    fields: [cities.integrationId],
    references: [integrations.id],
  }),
  projects: many(projects),
}));
