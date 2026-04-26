import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { apartmentStatusEnum } from "./_enums";
import { sites } from "./sites";
import { integrations } from "./integrations";
import { projects } from "./projects";
import { buildings } from "./buildings";
import { sections } from "./sections";
import { entrances } from "./entrances";
import { floors } from "./floors";
import { apartmentLayouts } from "./apartment-layouts";
import { decorations } from "./decorations";
import { apartmentPromotions } from "./promotions";
import { apartmentTags } from "./apartment-tags";

export const apartments = pgTable("apartments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id),
  name: text("name").notNull(),
  apartmentNumber: text("apartment_number").notNull(),
  area: numeric("area", { precision: 10, scale: 2 }).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  oldPrice: numeric("old_price", { precision: 12, scale: 2 }),
  floorNumber: integer("floor_number").notNull(),
  roomsCount: integer("rooms_count").notNull(),
  status: apartmentStatusEnum("status").default("free").notNull(),
  isPublished: boolean("is_published").default(true),
  isPopular: boolean("is_popular").default(false),
  isStudio: boolean("is_studio").default(false),
  isApartment: boolean("is_apartment").default(true),
  monthlyMortgagePayment: numeric("monthly_mortgage_payment", {
    precision: 12,
    scale: 2,
  }),
  windowView: text("window_view"),
  ceilingHeight: numeric("ceiling_height", { precision: 4, scale: 2 }),
  sunPosition: integer("sun_position"),
  threeDTourUrl: text("3d_tour_url"),
  completionDate: date("completion_date"),
  projectId: text("project_id").references(() => projects.id),
  buildingId: text("building_id").references(() => buildings.id),
  sectionId: text("section_id").references(() => sections.id),
  entranceId: text("entrance_id").references(() => entrances.id),
  floorId: text("floor_id").references(() => floors.id),
  apartmentLayoutId: text("apartment_layout_id").references(
    () => apartmentLayouts.id,
  ),
  decorationId: text("decoration_id").references(() => decorations.id),
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

export const apartmentsRelations = relations(apartments, ({ one, many }) => ({
  site: one(sites, {
    fields: [apartments.siteId],
    references: [sites.id],
  }),
  project: one(projects, {
    fields: [apartments.projectId],
    references: [projects.id],
  }),
  building: one(buildings, {
    fields: [apartments.buildingId],
    references: [buildings.id],
  }),
  section: one(sections, {
    fields: [apartments.sectionId],
    references: [sections.id],
  }),
  entrance: one(entrances, {
    fields: [apartments.entranceId],
    references: [entrances.id],
  }),
  floor: one(floors, {
    fields: [apartments.floorId],
    references: [floors.id],
  }),
  apartmentLayout: one(apartmentLayouts, {
    fields: [apartments.apartmentLayoutId],
    references: [apartmentLayouts.id],
  }),
  decoration: one(decorations, {
    fields: [apartments.decorationId],
    references: [decorations.id],
  }),
  integration: one(integrations, {
    fields: [apartments.integrationId],
    references: [integrations.id],
  }),
  promotions: many(apartmentPromotions),
  apartmentTags: many(apartmentTags),
}));
