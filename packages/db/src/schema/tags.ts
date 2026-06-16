import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";
import { integrations } from "./integrations";
import { apartmentLayoutTags } from "./apartment-layout-tags";
import { apartmentTags } from "./apartment-tags";

export const tags = pgTable("tags", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
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
  site: one(sites, {
    fields: [tags.siteId],
    references: [sites.id],
  }),
  integration: one(integrations, {
    fields: [tags.integrationId],
    references: [integrations.id],
  }),
  apartmentLayoutTags: many(apartmentLayoutTags),
  apartmentTags: many(apartmentTags),
}));
