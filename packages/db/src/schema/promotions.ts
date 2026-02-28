import { relations } from "drizzle-orm";
import { date, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { integrations } from "./integrations";
import { apartments } from "./apartments";

export const promotions = pgTable("promotions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .default("default")
    .references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  dateStart: date("date_start"),
  dateEnd: date("date_end"),
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
  tenant: one(tenants, {
    fields: [promotions.tenantId],
    references: [tenants.id],
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
