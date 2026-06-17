import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { documentStatusEnum } from "./_enums";
import type { ContentBlock } from "./_shared";
import { sites } from "./sites";

export const documents = pgTable("documents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  status: documentStatusEnum("status").notNull().default("draft"),
  sortOrder: integer("sort_order").notNull().default(0),
  contentBlocks: jsonb("content_blocks").$type<ContentBlock[]>().default([]),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const documentsRelations = relations(documents, ({ one }) => ({
  site: one(sites, {
    fields: [documents.siteId],
    references: [sites.id],
  }),
}));
