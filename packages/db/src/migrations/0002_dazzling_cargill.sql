CREATE TYPE "public"."document_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."news_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."page_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."promotion_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"address" text NOT NULL,
	"working_hours" text,
	"coordinates" text,
	"map_link" text,
	"location" text,
	"socials" jsonb DEFAULT '[]'::jsonb,
	"offices" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"content_blocks" jsonb DEFAULT '[]'::jsonb,
	"meta_title" text,
	"meta_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"cover_image" text,
	"status" "news_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"content_blocks" jsonb DEFAULT '[]'::jsonb,
	"meta_title" text,
	"meta_description" text,
	"og_image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text DEFAULT 'default' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"status" "page_status" DEFAULT 'draft' NOT NULL,
	"content_blocks" jsonb DEFAULT '[]'::jsonb,
	"meta_title" text,
	"meta_description" text,
	"project_id" text,
	"og_image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "cover_image" text;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "status" "promotion_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "content_blocks" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "meta_title" text;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "meta_description" text;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "og_image" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;