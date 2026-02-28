import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { integrations } from "./integrations";
import { sections } from "./sections";
import { entrances } from "./entrances";

export const floorLayouts = pgTable("floor_layouts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .default("default")
    .references(() => tenants.id),
  layout: text("layout").notNull(),
  sectionId: text("section_id").references(() => sections.id),
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

export const floorLayoutsRelations = relations(floorLayouts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [floorLayouts.tenantId],
    references: [tenants.id],
  }),
  section: one(sections, {
    fields: [floorLayouts.sectionId],
    references: [sections.id],
  }),
  integration: one(integrations, {
    fields: [floorLayouts.integrationId],
    references: [integrations.id],
  }),
}));

export const floors = pgTable("floors", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .default("default")
    .references(() => tenants.id),
  sectionId: text("section_id").references(() => sections.id, {
    onDelete: "cascade",
  }),
  entranceId: text("entrance_id").references(() => entrances.id),
  floorLayoutId: text("floor_layout_id").references(() => floorLayouts.id),
  floorNumber: integer("floor_number"),
  floorImage: text("floor_image"),
  svgScheme: text("svg_scheme"),
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

export const floorsRelations = relations(floors, ({ one }) => ({
  tenant: one(tenants, {
    fields: [floors.tenantId],
    references: [tenants.id],
  }),
  section: one(sections, {
    fields: [floors.sectionId],
    references: [sections.id],
  }),
  entrance: one(entrances, {
    fields: [floors.entranceId],
    references: [entrances.id],
  }),
  floorLayout: one(floorLayouts, {
    fields: [floors.floorLayoutId],
    references: [floorLayouts.id],
  }),
  integration: one(integrations, {
    fields: [floors.integrationId],
    references: [integrations.id],
  }),
}));
