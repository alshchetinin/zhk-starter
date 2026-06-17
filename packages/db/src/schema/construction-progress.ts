import { relations } from "drizzle-orm";
import { date, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { ContentBlock } from "./_shared";
import { constructionProgressStatusEnum } from "./_enums";
import { sites } from "./sites";
import { projects } from "./projects";
import { buildings } from "./buildings";

export const constructionProgress = pgTable("construction_progress", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  buildingId: text("building_id").references(() => buildings.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  date: date("date").notNull(),
  gallery: jsonb("gallery").$type<string[]>().default([]),
  contentBlocks: jsonb("content_blocks").$type<ContentBlock[]>().default([]),
  status: constructionProgressStatusEnum("status")
    .notNull()
    .default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const constructionProgressRelations = relations(
  constructionProgress,
  ({ one }) => ({
    site: one(sites, {
      fields: [constructionProgress.siteId],
      references: [sites.id],
    }),
    project: one(projects, {
      fields: [constructionProgress.projectId],
      references: [projects.id],
    }),
    building: one(buildings, {
      fields: [constructionProgress.buildingId],
      references: [buildings.id],
    }),
  }),
);
