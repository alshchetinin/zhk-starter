import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { pageStatusEnum } from "./_enums";
import type { ContentBlock } from "./_shared";
import { sites } from "./sites";
import { projects } from "./projects";

export const pages = pgTable("pages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  status: pageStatusEnum("status").notNull().default("draft"),
  contentBlocks: jsonb("content_blocks").$type<ContentBlock[]>().default([]),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  ogImage: text("og_image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const pagesRelations = relations(pages, ({ one }) => ({
  site: one(sites, {
    fields: [pages.siteId],
    references: [sites.id],
  }),
  project: one(projects, {
    fields: [pages.projectId],
    references: [projects.id],
  }),
}));
