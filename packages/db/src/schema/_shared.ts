import { text, timestamp } from "drizzle-orm/pg-core";

/** Loose type for JSONB columns — API layer validates with stricter Zod schema */
export interface ContentBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface InfraCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export interface InfraPin {
  id: string;
  title: string;
  coordinates: string;
  categoryId: string;
  description?: string;
}

export const baseColumns = {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id").notNull().default("default"),
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
