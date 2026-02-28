import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { integrationStatusEnum, integrationTypeEnum } from "./_enums";
import { tenants } from "./tenants";

export const integrations = pgTable("integrations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .default("default")
    .references(() => tenants.id),
  type: integrationTypeEnum("type"),
  domain: text("domain"),
  apiDomain: text("api_domain"),
  appSecret: text("app_secret"),
  feedUrl: text("feed_url"),
  status: integrationStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const integrationsRelations = relations(integrations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [integrations.tenantId],
    references: [tenants.id],
  }),
}));
