import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { cities } from "./cities";

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey().default("default"),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  mode: text("mode", { enum: ["complex", "developer"] }).default("complex"),
  themeTokens: jsonb("theme_tokens"),
  blockVariants: jsonb("block_variants"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  projects: many(projects),
  cities: many(cities),
}));
