import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { integrations } from "./integrations";
import { apartmentLayoutTags } from "./apartment-layout-tags";

export const tags = pgTable("tags", {
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

export const tagsRelations = relations(tags, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [tags.tenantId],
    references: [tenants.id],
  }),
  integration: one(integrations, {
    fields: [tags.integrationId],
    references: [integrations.id],
  }),
  apartmentLayoutTags: many(apartmentLayoutTags),
}));
