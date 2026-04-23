import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { sites } from "./sites";

export const contentVersions = pgTable("content_versions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  note: text("note"),
  createdById: text("created_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const contentVersionsRelations = relations(contentVersions, ({ one }) => ({
  site: one(sites, {
    fields: [contentVersions.siteId],
    references: [sites.id],
  }),
  createdBy: one(user, {
    fields: [contentVersions.createdById],
    references: [user.id],
  }),
}));
