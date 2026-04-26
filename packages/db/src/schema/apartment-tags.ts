import { relations } from "drizzle-orm";
import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { apartments } from "./apartments";
import { tags } from "./tags";

export const apartmentTags = pgTable(
  "apartment_tags",
  {
    apartmentId: text("apartment_id")
      .notNull()
      .references(() => apartments.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.apartmentId, t.tagId] })],
);

export const apartmentTagsRelations = relations(apartmentTags, ({ one }) => ({
  apartment: one(apartments, {
    fields: [apartmentTags.apartmentId],
    references: [apartments.id],
  }),
  tag: one(tags, {
    fields: [apartmentTags.tagId],
    references: [tags.id],
  }),
}));
