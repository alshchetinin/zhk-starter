import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { ContentBlock } from "./_shared";
import { tenants } from "./tenants";

export const homepage = pgTable("homepage", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .default("default")
    .references(() => tenants.id),
  contentBlocks: jsonb("content_blocks").$type<ContentBlock[]>().default([]),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const homepageRelations = relations(homepage, ({ one }) => ({
  tenant: one(tenants, {
    fields: [homepage.tenantId],
    references: [tenants.id],
  }),
}));
