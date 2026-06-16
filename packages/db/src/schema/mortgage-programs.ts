import { relations } from "drizzle-orm";
import {
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { mortgageProgramStatusEnum } from "./_enums";
import { banks } from "./banks";
import { projects } from "./projects";
import { sites } from "./sites";

export const mortgagePrograms = pgTable("mortgage_programs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  rate: numeric("rate", { precision: 5, scale: 2 }).notNull(),
  maxLoanAmount: numeric("max_loan_amount", { precision: 14, scale: 2 }),
  minDownPaymentPercent: numeric("min_down_payment_percent", {
    precision: 5,
    scale: 2,
  }),
  termMonths: integer("term_months"),
  bankId: text("bank_id").references(() => banks.id),
  status: mortgageProgramStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const mortgageProgramsRelations = relations(
  mortgagePrograms,
  ({ one, many }) => ({
    site: one(sites, {
      fields: [mortgagePrograms.siteId],
      references: [sites.id],
    }),
    bank: one(banks, {
      fields: [mortgagePrograms.bankId],
      references: [banks.id],
    }),
    programProjects: many(mortgageProgramProjects),
  }),
);

export const mortgageProgramProjects = pgTable(
  "mortgage_program_projects",
  {
    mortgageProgramId: text("mortgage_program_id")
      .notNull()
      .references(() => mortgagePrograms.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.mortgageProgramId, t.projectId] })],
);

export const mortgageProgramProjectsRelations = relations(
  mortgageProgramProjects,
  ({ one }) => ({
    mortgageProgram: one(mortgagePrograms, {
      fields: [mortgageProgramProjects.mortgageProgramId],
      references: [mortgagePrograms.id],
    }),
    project: one(projects, {
      fields: [mortgageProgramProjects.projectId],
      references: [projects.id],
    }),
  }),
);
