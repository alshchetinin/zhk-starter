import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { purchaseMethodKindEnum } from "./_enums";
import { projects } from "./projects";
import { sites } from "./sites";

export const purchaseMethods = pgTable("purchase_methods", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  kind: purchaseMethodKindEnum("kind").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const purchaseMethodsRelations = relations(
  purchaseMethods,
  ({ one, many }) => ({
    site: one(sites, {
      fields: [purchaseMethods.siteId],
      references: [sites.id],
    }),
    methodProjects: many(purchaseMethodProjects),
  }),
);

export const purchaseMethodProjects = pgTable(
  "purchase_method_projects",
  {
    purchaseMethodId: text("purchase_method_id")
      .notNull()
      .references(() => purchaseMethods.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.purchaseMethodId, t.projectId] })],
);

export const purchaseMethodProjectsRelations = relations(
  purchaseMethodProjects,
  ({ one }) => ({
    purchaseMethod: one(purchaseMethods, {
      fields: [purchaseMethodProjects.purchaseMethodId],
      references: [purchaseMethods.id],
    }),
    project: one(projects, {
      fields: [purchaseMethodProjects.projectId],
      references: [projects.id],
    }),
  }),
);
