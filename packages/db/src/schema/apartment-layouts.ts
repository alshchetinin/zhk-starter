import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sites } from "./sites";
import { integrations } from "./integrations";
import { apartmentLayoutTags } from "./apartment-layout-tags";

export const apartmentLayouts = pgTable("apartment_layouts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id),
  name: text("name").notNull(),
  area: numeric("area", { precision: 10, scale: 2 }).notNull(),
  roomsCount: integer("rooms_count").notNull(),
  floorRange: text("floor_range"),
  priceRange: text("price_range"),
  defaultLayoutImage: text("default_layout_image"),
  furnishedLayoutImage: text("furnished_layout_image"),
  threeDLayoutImage: text("3d_layout_image"),
  sunPosition: integer("sun_position"),
  ceilingHeight: numeric("ceiling_height", { precision: 4, scale: 2 }),
  additionalArea: jsonb("additional_area"),
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

export const apartmentLayoutsRelations = relations(
  apartmentLayouts,
  ({ one, many }) => ({
    site: one(sites, {
      fields: [apartmentLayouts.siteId],
      references: [sites.id],
    }),
    integration: one(integrations, {
      fields: [apartmentLayouts.integrationId],
      references: [integrations.id],
    }),
    tags: many(apartmentLayoutTags),
  }),
);
