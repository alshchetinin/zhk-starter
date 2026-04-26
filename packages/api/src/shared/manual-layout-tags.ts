import { db } from "@zhk/db";
import { apartmentLayoutTags } from "@zhk/db/schema";
import { and, eq } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function replaceManualLayoutTags(
  tx: Tx,
  layoutId: string,
  tagIds: string[],
): Promise<void> {
  await tx
    .delete(apartmentLayoutTags)
    .where(
      and(
        eq(apartmentLayoutTags.layoutId, layoutId),
        eq(apartmentLayoutTags.isManual, true),
      ),
    );
  if (tagIds.length === 0) return;
  await tx
    .insert(apartmentLayoutTags)
    .values(tagIds.map((tagId) => ({ layoutId, tagId, isManual: true })))
    .onConflictDoUpdate({
      target: [apartmentLayoutTags.layoutId, apartmentLayoutTags.tagId],
      set: { isManual: true },
    });
}
