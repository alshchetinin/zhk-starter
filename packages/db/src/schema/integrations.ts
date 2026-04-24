import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  integrationStatusEnum,
  integrationTypeEnum,
  syncNotifyLevelEnum,
} from "./_enums";
import { sites } from "./sites";
import { syncLogs } from "./sync-logs";

export const integrations = pgTable(
  "integrations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    siteId: text("site_id")
      .notNull()
      .default("default")
      .references(() => sites.id),
    type: integrationTypeEnum("type"),
    domain: text("domain"),
    apiDomain: text("api_domain"),
    appSecret: text("app_secret"),
    macroType: text("macro_type"),
    feedUrl: text("feed_url"),
    isActive: boolean("is_active").default(false).notNull(),
    status: integrationStatusEnum("status").default("pending"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),

    autoSyncEnabled: boolean("auto_sync_enabled").default(false).notNull(),
    syncIntervalMinutes: integer("sync_interval_minutes").default(60).notNull(),
    pausedUntil: timestamp("paused_until", { withTimezone: true }),
    syncWindowStart: integer("sync_window_start"),
    syncWindowEnd: integer("sync_window_end"),

    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastSyncDurationMs: integer("last_sync_duration_ms"),
    nextSyncAt: timestamp("next_sync_at", { withTimezone: true }),

    retryAttempts: integer("retry_attempts").default(3).notNull(),
    retryDelayMinutes: integer("retry_delay_minutes").default(5).notNull(),
    logsRetentionDays: integer("logs_retention_days").default(30).notNull(),

    notifyLevel: syncNotifyLevelEnum("notify_level").default("errors").notNull(),
    notifyTelegramBotToken: text("notify_telegram_bot_token"),
    notifyTelegramChatId: text("notify_telegram_chat_id"),

    cancelRequested: boolean("cancel_requested").default(false).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [uniqueIndex("integrations_site_id_unique").on(t.siteId)],
);

export const integrationsRelations = relations(integrations, ({ one, many }) => ({
  site: one(sites, {
    fields: [integrations.siteId],
    references: [sites.id],
  }),
  syncLogs: many(syncLogs),
}));
