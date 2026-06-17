ALTER TABLE "sites" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "apartment_layouts" DROP CONSTRAINT "apartment_layouts_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "apartments" DROP CONSTRAINT "apartments_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "banks" DROP CONSTRAINT "banks_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "buildings" DROP CONSTRAINT "buildings_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "commerce" DROP CONSTRAINT "commerce_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "construction_progress" DROP CONSTRAINT "construction_progress_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "contacts" DROP CONSTRAINT "contacts_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "decorations" DROP CONSTRAINT "decorations_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT "documents_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "entrances" DROP CONSTRAINT "entrances_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "floor_layouts" DROP CONSTRAINT "floor_layouts_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "floors" DROP CONSTRAINT "floors_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "homepage" DROP CONSTRAINT "homepage_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "integrations" DROP CONSTRAINT "integrations_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "mortgage_programs" DROP CONSTRAINT "mortgage_programs_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "news" DROP CONSTRAINT "news_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "non_residential_floors" DROP CONSTRAINT "non_residential_floors_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "page_categories" DROP CONSTRAINT "page_categories_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "pages" DROP CONSTRAINT "pages_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "parking" DROP CONSTRAINT "parking_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "promotions" DROP CONSTRAINT "promotions_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "purchase_methods" DROP CONSTRAINT "purchase_methods_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "sections" DROP CONSTRAINT "sections_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "storage" DROP CONSTRAINT "storage_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "tags" DROP CONSTRAINT "tags_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_site_id_sites_id_fk";--> statement-breakpoint
ALTER TABLE "apartment_layouts" ADD CONSTRAINT "apartment_layouts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banks" ADD CONSTRAINT "banks_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce" ADD CONSTRAINT "commerce_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "construction_progress" ADD CONSTRAINT "construction_progress_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decorations" ADD CONSTRAINT "decorations_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entrances" ADD CONSTRAINT "entrances_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_layouts" ADD CONSTRAINT "floor_layouts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floors" ADD CONSTRAINT "floors_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage" ADD CONSTRAINT "homepage_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mortgage_programs" ADD CONSTRAINT "mortgage_programs_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_residential_floors" ADD CONSTRAINT "non_residential_floors_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_categories" ADD CONSTRAINT "page_categories_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parking" ADD CONSTRAINT "parking_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_methods" ADD CONSTRAINT "purchase_methods_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage" ADD CONSTRAINT "storage_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;
