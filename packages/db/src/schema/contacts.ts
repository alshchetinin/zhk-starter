import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

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
  tenantId: text("tenant_id")
    .notNull()
    .default("default")
    .references(() => tenants.id),
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
  tenant: one(tenants, {
    fields: [contacts.tenantId],
    references: [tenants.id],
  }),
}));
