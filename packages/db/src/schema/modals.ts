import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { modalStatusEnum } from "./_enums";
import { sites } from "./sites";

interface ModalFieldJson {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  mask?: string;
}

export const modals = pgTable("modals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  image: text("image"),
  successMessage: text("success_message"),
  fields: jsonb("fields").$type<ModalFieldJson[]>().default([]),
  status: modalStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (t) => [
  unique().on(t.siteId, t.slug),
]);

export const modalsRelations = relations(modals, ({ one }) => ({
  site: one(sites, {
    fields: [modals.siteId],
    references: [sites.id],
  }),
}));
