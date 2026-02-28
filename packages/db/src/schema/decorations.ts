import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const decorations = pgTable("decorations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .default("default")
    .references(() => tenants.id),
  title: text("title"),
  titleAdmin: text("title_admin"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const decorationsRelations = relations(decorations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [decorations.tenantId],
    references: [tenants.id],
  }),
}));
