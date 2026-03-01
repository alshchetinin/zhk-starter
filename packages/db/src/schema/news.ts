import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { newsStatusEnum } from "./_enums";
import { tenants } from "./tenants";

export const news = pgTable("news", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .default("default")
    .references(() => tenants.id),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const newsRelations = relations(news, ({ one }) => ({
  tenant: one(tenants, {
    fields: [news.tenantId],
    references: [tenants.id],
  }),
}));

// Loose type for JSONB column — API layer validates with stricter Zod schema
interface ContentBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
}
