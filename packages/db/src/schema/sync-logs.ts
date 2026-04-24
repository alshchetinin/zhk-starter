import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { syncLogStatusEnum, syncLogTriggerEnum } from "./_enums";
import { integrations } from "./integrations";

export type SyncLogTrigger = "manual" | "scheduled" | "retry";
export type SyncLogStatus = "running" | "success" | "failed" | "cancelled";
export type SyncLogStats = {
  projects?: number;
  units?: number;
  created?: number;
  updated?: number;
  skipped?: number;
};

export const syncLogs = pgTable(
  "sync_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    integrationId: text("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    trigger: syncLogTriggerEnum("trigger").notNull(),
    status: syncLogStatusEnum("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    stats: jsonb("stats").$type<SyncLogStats>(),
    error: text("error"),
    errorStack: text("error_stack"),
  },
  (t) => [
    index("sync_logs_integration_started_idx").on(
      t.integrationId,
      t.startedAt.desc(),
    ),
  ],
);

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  integration: one(integrations, {
    fields: [syncLogs.integrationId],
    references: [integrations.id],
  }),
}));
