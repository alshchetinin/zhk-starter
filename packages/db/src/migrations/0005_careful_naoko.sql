ALTER TABLE "projects" ADD COLUMN "infrastructure_categories" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "infrastructure_pins" jsonb DEFAULT '[]'::jsonb;