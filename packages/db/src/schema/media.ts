import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const media = pgTable("media", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  url: text("url").notNull(),
  key: text("key").notNull(),
  fileName: text("file_name"),
  contentType: text("content_type"),
  fileSize: integer("file_size"),
  folder: text("folder"),
  alt: text("alt"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
