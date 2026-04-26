-- Collapse duplicate tags to canonical (MIN id) per (site_id, name) and
-- enforce UNIQUE so future syncs cannot recreate dupes.

INSERT INTO apartment_layout_tags (layout_id, tag_id)
SELECT DISTINCT alt.layout_id, c.canonical_id
FROM apartment_layout_tags alt
JOIN tags t ON t.id = alt.tag_id
JOIN (
  SELECT site_id, name, MIN(id) AS canonical_id
  FROM tags
  GROUP BY site_id, name
) c ON c.site_id = t.site_id AND c.name = t.name
WHERE alt.tag_id <> c.canonical_id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DELETE FROM apartment_layout_tags alt
USING tags t, (
  SELECT site_id, name, MIN(id) AS canonical_id
  FROM tags
  GROUP BY site_id, name
) c
WHERE alt.tag_id = t.id
  AND t.site_id = c.site_id
  AND t.name = c.name
  AND alt.tag_id <> c.canonical_id;
--> statement-breakpoint
INSERT INTO apartment_tags (apartment_id, tag_id)
SELECT DISTINCT at_.apartment_id, c.canonical_id
FROM apartment_tags at_
JOIN tags t ON t.id = at_.tag_id
JOIN (
  SELECT site_id, name, MIN(id) AS canonical_id
  FROM tags
  GROUP BY site_id, name
) c ON c.site_id = t.site_id AND c.name = t.name
WHERE at_.tag_id <> c.canonical_id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DELETE FROM apartment_tags at_
USING tags t, (
  SELECT site_id, name, MIN(id) AS canonical_id
  FROM tags
  GROUP BY site_id, name
) c
WHERE at_.tag_id = t.id
  AND t.site_id = c.site_id
  AND t.name = c.name
  AND at_.tag_id <> c.canonical_id;
--> statement-breakpoint
DELETE FROM tags t
USING (
  SELECT site_id, name, MIN(id) AS canonical_id
  FROM tags
  GROUP BY site_id, name
) c
WHERE t.site_id = c.site_id
  AND t.name = c.name
  AND t.id <> c.canonical_id;
--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_site_id_name_unique" UNIQUE ("site_id", "name");
