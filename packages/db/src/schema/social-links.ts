import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";

export const SOCIAL_LINK_TYPES = [
  "vk",
  "telegram",
  "whatsapp",
  "ok",
  "youtube",
  "dzen",
] as const;

export type SocialLinkType = (typeof SOCIAL_LINK_TYPES)[number];

export const socialLinks = pgTable("social_links", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id").references(() => sites.id, { onDelete: "cascade" }),
  type: text("type").$type<SocialLinkType>().notNull(),
  link: text("link").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const socialLinksRelations = relations(socialLinks, ({ one }) => ({
  site: one(sites, {
    fields: [socialLinks.siteId],
    references: [sites.id],
  }),
}));
