ALTER TABLE "sites" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "access_password" text;
