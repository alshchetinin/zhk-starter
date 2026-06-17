import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";

export interface ContactSocial {
  link: string;
  type: "vk" | "telegram" | "whatsapp" | "ok" | "youtube" | "dzen";
}

export const contacts = pgTable("contacts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  workingHours: text("working_hours"),
  coordinates: text("coordinates"),
  mapLink: text("map_link"),
  image: text("image"),
  socials: jsonb("socials").$type<ContactSocial[]>().notNull().default([]),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const contactsRelations = relations(contacts, ({ one }) => ({
  site: one(sites, {
    fields: [contacts.siteId],
    references: [sites.id],
  }),
}));
