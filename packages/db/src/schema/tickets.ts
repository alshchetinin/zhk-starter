import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { ticketTypeEnum } from "./_enums";
import { sites } from "./sites";
import { integrations } from "./integrations";
import { apartments } from "./apartments";
import { formDeliveries } from "./form-deliveries";

export const tickets = pgTable("tickets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  message: text("message"),
  comment: text("comment"),
  type: ticketTypeEnum("type").notNull().default("lead"),
  requestType: text("request_type"),
  source: text("source"),
  url: text("url"),
  utm: jsonb("utm").$type<Record<string, string>>(),
  additionalInfo: jsonb("additional_info").$type<{
    fields: { key: string; type: string; label: string; value: string | boolean }[];
  } | null>(),
  apartmentId: text("apartment_id").references(() => apartments.id),
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

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  site: one(sites, {
    fields: [tickets.siteId],
    references: [sites.id],
  }),
  apartment: one(apartments, {
    fields: [tickets.apartmentId],
    references: [apartments.id],
  }),
  integration: one(integrations, {
    fields: [tickets.integrationId],
    references: [integrations.id],
  }),
  deliveries: many(formDeliveries),
}));
