-- Перенос sunPosition с layout/building на section.
-- Эффективное значение для квартиры: apartment.sun_position ?? section.sun_position.

ALTER TABLE "sections" ADD COLUMN "sun_position" integer;--> statement-breakpoint

-- Перенос данных из apartment_layouts в sections (мода значений по секции).
WITH layout_modes AS (
  SELECT
    a.section_id,
    al.sun_position,
    COUNT(*) AS cnt,
    ROW_NUMBER() OVER (PARTITION BY a.section_id ORDER BY COUNT(*) DESC) AS rn
  FROM "apartments" a
  JOIN "apartment_layouts" al ON al.id = a.apartment_layout_id
  WHERE al.sun_position IS NOT NULL AND a.section_id IS NOT NULL
  GROUP BY a.section_id, al.sun_position
)
UPDATE "sections" s
SET "sun_position" = lm.sun_position
FROM layout_modes lm
WHERE lm.section_id = s.id AND lm.rn = 1 AND s.sun_position IS NULL;--> statement-breakpoint

-- Если у секции значение всё ещё NULL — попробовать унаследовать из building.
UPDATE "sections" s
SET "sun_position" = b.sun_position
FROM "buildings" b
WHERE s.building_id = b.id
  AND s.sun_position IS NULL
  AND b.sun_position IS NOT NULL;--> statement-breakpoint

ALTER TABLE "apartment_layouts" DROP COLUMN "sun_position";--> statement-breakpoint
ALTER TABLE "buildings" DROP COLUMN "sun_position";
