CREATE TYPE "public"."construction_progress_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "construction_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"project_id" text NOT NULL,
	"building_id" text,
	"title" text NOT NULL,
	"description" text,
	"date" date NOT NULL,
	"gallery" jsonb DEFAULT '[]'::jsonb,
	"content_blocks" jsonb DEFAULT '[]'::jsonb,
	"status" "construction_progress_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buildings" ADD COLUMN "camera_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "camera_url" text;--> statement-breakpoint
ALTER TABLE "construction_progress" ADD CONSTRAINT "construction_progress_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_progress" ADD CONSTRAINT "construction_progress_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_progress" ADD CONSTRAINT "construction_progress_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE set null ON UPDATE no action;