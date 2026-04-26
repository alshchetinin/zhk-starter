CREATE TABLE "apartment_tags" (
	"apartment_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "apartment_tags_apartment_id_tag_id_pk" PRIMARY KEY("apartment_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "apartment_tags" ADD CONSTRAINT "apartment_tags_apartment_id_apartments_id_fk" FOREIGN KEY ("apartment_id") REFERENCES "public"."apartments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apartment_tags" ADD CONSTRAINT "apartment_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "description" text;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "image_url" text;--> statement-breakpoint
UPDATE "apartment_layouts" SET "synced_fields" = (SELECT jsonb_agg(v) FROM jsonb_array_elements_text("synced_fields") v WHERE v <> 'tags') WHERE "synced_fields" IS NOT NULL AND "synced_fields" @> '["tags"]'::jsonb;
