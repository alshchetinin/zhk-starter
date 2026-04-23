import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";

export interface ContactSocial {
  link: string;
  type: "vk" | "telegram" | "whatsapp" | "ok" | "youtube" | "dzen";
}

export interface ContactOffice {
  title: string;
  address: string;
  phone?: string;
  email?: string;
  workingHours?: string;
  coordinates?: string;
  image?: string;
}

export const contacts = pgTable("contacts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address").notNull(),
  workingHours: text("working_hours"),
  coordinates: text("coordinates"),
  mapLink: text("map_link"),
  location: text("location"),
  socials: jsonb("socials").$type<ContactSocial[]>().default([]),
  offices: jsonb("offices").$type<ContactOffice[]>().default([]),
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
