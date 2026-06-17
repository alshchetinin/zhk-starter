ALTER TABLE "pages" ADD COLUMN "breadcrumbs" jsonb NOT NULL DEFAULT '{"mode":"auto","items":[]}'::jsonb;--> statement-breakpoint
ALTER TABLE "news" ADD COLUMN "breadcrumbs" jsonb NOT NULL DEFAULT '{"mode":"auto","items":[]}'::jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "breadcrumbs" jsonb NOT NULL DEFAULT '{"mode":"auto","items":[]}'::jsonb;
