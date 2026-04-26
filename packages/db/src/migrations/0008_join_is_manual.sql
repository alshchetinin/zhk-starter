-- Track whether a tag-layout link is manual (added via admin UI) or imported
-- (created by sync). Sync only manages is_manual=false links; manual ones
-- survive sync regardless of whether the underlying tag is imported.

ALTER TABLE "apartment_layout_tags" ADD COLUMN "is_manual" boolean DEFAULT false NOT NULL;
