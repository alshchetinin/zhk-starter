import { relations } from "drizzle-orm";
import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { apartmentLayouts } from "./apartment-layouts";
import { tags } from "./tags";

export const apartmentLayoutTags = pgTable(
  "apartment_layout_tags",
  {
    layoutId: text("layout_id")
      .notNull()
      .references(() => apartmentLayouts.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.layoutId, t.tagId] })],
);

export const apartmentLayoutTagsRelations = relations(
  apartmentLayoutTags,
  ({ one }) => ({
    apartmentLayout: one(apartmentLayouts, {
      fields: [apartmentLayoutTags.layoutId],
      references: [apartmentLayouts.id],
    }),
    tag: one(tags, {
      fields: [apartmentLayoutTags.tagId],
      references: [tags.id],
    }),
  }),
);
