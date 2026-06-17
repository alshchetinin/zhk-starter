import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { newsStatusEnum } from "./_enums";
import type { ContentBlock, BreadcrumbsConfig } from "./_shared";
import { defaultBreadcrumbsValue } from "./_shared";
import { sites } from "./sites";

export const news = pgTable("news", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  excerpt: text("excerpt"),
  coverImage: text("cover_image"),
  status: newsStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  contentBlocks: jsonb("content_blocks").$type<ContentBlock[]>().default([]),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  breadcrumbs: jsonb("breadcrumbs")
    .$type<BreadcrumbsConfig>()
    .notNull()
    .default(defaultBreadcrumbsValue),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const newsRelations = relations(news, ({ one }) => ({
  site: one(sites, {
    fields: [news.siteId],
    references: [sites.id],
  }),
}));
