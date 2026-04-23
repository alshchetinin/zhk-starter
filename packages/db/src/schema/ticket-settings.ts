import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";

export const ticketSettings = pgTable("ticket_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .default("default")
    .references(() => sites.id),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const ticketSettingsRelations = relations(ticketSettings, ({ one }) => ({
  site: one(sites, {
    fields: [ticketSettings.siteId],
    references: [sites.id],
  }),
}));
