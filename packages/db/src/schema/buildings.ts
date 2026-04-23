import { relations } from "drizzle-orm";
import { date, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";
import { integrations } from "./integrations";
import { projects } from "./projects";
import { sections } from "./sections";

export const buildings = pgTable("buildings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id),
  name: text("name").notNull(),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  masterplanImage: text("masterplan_image"),
  masterplanScheme: text("masterplan_scheme"),
  completionDate: date("completion_date"),
  sunPosition: integer("sun_position"),
  renovationCost: integer("renovation_cost"),
  cameraUrl: text("camera_url"),
  externalId: text("external_id"),
  integrationId: text("integration_id").references(() => integrations.id),
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

export const buildingsRelations = relations(buildings, ({ one, many }) => ({
  site: one(sites, {
    fields: [buildings.siteId],
    references: [sites.id],
  }),
  project: one(projects, {
    fields: [buildings.projectId],
    references: [projects.id],
  }),
  integration: one(integrations, {
    fields: [buildings.integrationId],
    references: [integrations.id],
  }),
  sections: many(sections),
}));
