import { text, timestamp } from "drizzle-orm/pg-core";

export const baseColumns = {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").notNull().default("default"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  externalId: text("external_id"),
  integrationId: text("integration_id"),
};
