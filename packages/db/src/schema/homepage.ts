import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { ContentBlock } from "./_shared";
import { sites } from "./sites";

export const homepage = pgTable("homepage", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
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
  site: one(sites, {
    fields: [homepage.siteId],
    references: [sites.id],
  }),
}));
