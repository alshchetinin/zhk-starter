import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { deliveryStatusEnum } from "./_enums";
import { tickets } from "./tickets";
import { formReceivers } from "./form-receivers";

export const formDeliveries = pgTable("form_deliveries", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ticketId: text("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id").references(() => formReceivers.id, {
    onDelete: "set null",
  }),
  receiverType: text("receiver_type").notNull(),
  receiverName: text("receiver_name").notNull(),
  status: deliveryStatusEnum("status").notNull().default("pending"),
  error: text("error"),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const formDeliveriesRelations = relations(formDeliveries, ({ one }) => ({
  ticket: one(tickets, {
    fields: [formDeliveries.ticketId],
    references: [tickets.id],
  }),
  receiver: one(formReceivers, {
    fields: [formDeliveries.receiverId],
    references: [formReceivers.id],
  }),
}));
