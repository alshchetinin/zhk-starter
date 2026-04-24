import { eq, sql } from "drizzle-orm";
import { db } from "../index";
import { apartments } from "../schema/apartments";
import { projects } from "../schema/projects";
import { buildings } from "../schema/buildings";

export async function getProjectApartmentStats(projectId: string) {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      free: sql<number>`count(*) filter (where ${apartments.status} = 'free')::int`,
      paid: sql<number>`count(*) filter (where ${apartments.status} = 'paid_reservation')::int`,
      corporate: sql<number>`count(*) filter (where ${apartments.status} = 'corporate_reservation')::int`,
      sold: sql<number>`count(*) filter (where ${apartments.status} = 'sold')::int`,
    })
    .from(apartments)
    .where(eq(apartments.projectId, projectId));
  return stats ?? { total: 0, free: 0, paid: 0, corporate: 0, sold: 0 };
}

export async function recalculateProjectStatistics(
  projectId: string,
): Promise<void> {
  const projectStats = await getProjectApartmentStats(projectId);

  await db
    .update(projects)
    .set({
      totalApartmentsCount: projectStats.total,
      freeApartmentsCount: projectStats.free,
      paidReservationCount: projectStats.paid,
      corporateReservationCount: projectStats.corporate,
      soldApartmentsCount: projectStats.sold,
    })
    .where(eq(projects.id, projectId));

  const buildingStats = await db
    .select({
      buildingId: apartments.buildingId,
      total: sql<number>`count(*)::int`,
      free: sql<number>`count(*) filter (where ${apartments.status} = 'free')::int`,
      paid: sql<number>`count(*) filter (where ${apartments.status} = 'paid_reservation')::int`,
      corporate: sql<number>`count(*) filter (where ${apartments.status} = 'corporate_reservation')::int`,
      sold: sql<number>`count(*) filter (where ${apartments.status} = 'sold')::int`,
    })
    .from(apartments)
    .where(eq(apartments.projectId, projectId))
    .groupBy(apartments.buildingId);

  const buildingIdsWithApartments = new Set<string>();

  for (const bs of buildingStats) {
    if (!bs.buildingId) continue;
    buildingIdsWithApartments.add(bs.buildingId);
    await db
      .update(buildings)
      .set({
        totalApartmentsCount: bs.total,
        freeApartmentsCount: bs.free,
        paidReservationCount: bs.paid,
        corporateReservationCount: bs.corporate,
        soldApartmentsCount: bs.sold,
      })
      .where(eq(buildings.id, bs.buildingId));
  }

  // Reset stats for buildings with no apartments
  const allBuildings = await db
    .select({ id: buildings.id })
    .from(buildings)
    .where(eq(buildings.projectId, projectId));

  for (const b of allBuildings) {
    if (!buildingIdsWithApartments.has(b.id)) {
      await db
        .update(buildings)
        .set({
          totalApartmentsCount: 0,
          freeApartmentsCount: 0,
          paidReservationCount: 0,
          corporateReservationCount: 0,
          soldApartmentsCount: 0,
        })
        .where(eq(buildings.id, b.id));
    }
  }
}
