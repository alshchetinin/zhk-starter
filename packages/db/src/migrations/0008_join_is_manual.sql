-- is_manual marks links added by admin so sync only wipes is_manual=false.

ALTER TABLE "apartment_layout_tags" ADD COLUMN "is_manual" boolean DEFAULT false NOT NULL;
