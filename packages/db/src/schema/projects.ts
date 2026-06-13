import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { InfraCategory, InfraPin } from "./_shared";
import { projectStatusEnum } from "./_enums";
import { sites } from "./sites";
import { integrations } from "./integrations";
import { cities } from "./cities";
import { buildings } from "./buildings";

export const projects = pgTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  imageUrl: text("image_url"),
  type: text("type"),
  tags: text("tags").array(),
  status: projectStatusEnum("status").notNull(),
  coordinates: text("coordinates"),
  location: text("location"),
  gallery: text("gallery").array(),
  masterplanImage: text("masterplan_image"),
  masterplanScheme: text("masterplan_scheme"),
  cameraUrl: text("camera_url"),
  infrastructureCategories: jsonb("infrastructure_categories").$type<InfraCategory[]>().default([]),
  infrastructurePins: jsonb("infrastructure_pins").$type<InfraPin[]>().default([]),
  cityId: text("city_id").references(() => cities.id),
  externalId: text("external_id"),
  integrationId: text("integration_id").references(() => integrations.id),
  macroComplexId: integer("macro_complex_id"),
  macroComplexName: text("macro_complex_name"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncStatus: text("last_sync_status"),
  lastSyncError: text("last_sync_error"),
  freeApartmentsCount: integer("free_apartments_count").default(0),
  paidReservationCount: integer("paid_reservation_count").default(0),
  corporateReservationCount: integer("corporate_reservation_count").default(0),
  soldApartmentsCount: integer("sold_apartments_count").default(0),
  totalApartmentsCount: integer("total_apartments_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  site: one(sites, {
    fields: [projects.siteId],
    references: [sites.id],
  }),
  city: one(cities, {
    fields: [projects.cityId],
    references: [cities.id],
  }),
  integration: one(integrations, {
    fields: [projects.integrationId],
    references: [integrations.id],
  }),
  buildings: many(buildings),
}));
