import { relations } from "drizzle-orm";
import {
  date,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { promotionStatusEnum } from "./_enums";
import type { ContentBlock } from "./_shared";
import { sites } from "./sites";
import { integrations } from "./integrations";
import { apartments } from "./apartments";

export const promotions = pgTable("promotions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug"),
  description: text("description"),
  coverImage: text("cover_image"),
  status: promotionStatusEnum("status").notNull().default("draft"),
  dateStart: date("date_start"),
  dateEnd: date("date_end"),
  contentBlocks: jsonb("content_blocks").$type<ContentBlock[]>().default([]),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  externalId: text("external_id"),
  integrationId: text("integration_id").references(() => integrations.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const promotionsRelations = relations(promotions, ({ one, many }) => ({
  site: one(sites, {
    fields: [promotions.siteId],
    references: [sites.id],
  }),
  integration: one(integrations, {
    fields: [promotions.integrationId],
    references: [integrations.id],
  }),
  apartmentPromotions: many(apartmentPromotions),
}));

export const apartmentPromotions = pgTable(
  "apartment_promotions",
  {
    apartmentId: text("apartment_id")
      .notNull()
      .references(() => apartments.id, { onDelete: "cascade" }),
    promotionId: text("promotion_id")
      .notNull()
      .references(() => promotions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.apartmentId, t.promotionId] })],
);

export const apartmentPromotionsRelations = relations(
  apartmentPromotions,
  ({ one }) => ({
    apartment: one(apartments, {
      fields: [apartmentPromotions.apartmentId],
      references: [apartments.id],
    }),
    promotion: one(promotions, {
      fields: [apartmentPromotions.promotionId],
      references: [promotions.id],
    }),
  }),
);
