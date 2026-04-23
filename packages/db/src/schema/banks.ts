import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";

export const banks = pgTable("banks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id),
  name: text("name").notNull(),
  logo: text("logo"),
  description: text("description"),
  website: text("website"),
  brandColor: text("brand_color"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const banksRelations = relations(banks, ({ one }) => ({
  site: one(sites, {
    fields: [banks.siteId],
    references: [sites.id],
  }),
}));
