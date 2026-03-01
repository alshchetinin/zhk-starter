import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { pageStatusEnum } from "./_enums";
import type { ContentBlock } from "./_shared";
import { tenants } from "./tenants";
import { projects } from "./projects";

export const pages = pgTable("pages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .default("default")
    .references(() => tenants.id),
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
  tenant: one(tenants, {
    fields: [pages.tenantId],
    references: [tenants.id],
  }),
  project: one(projects, {
    fields: [pages.projectId],
    references: [projects.id],
  }),
}));
