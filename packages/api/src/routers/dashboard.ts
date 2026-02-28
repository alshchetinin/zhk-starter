import { db } from "@zhk/db";
import { projects, apartments, buildings, commerce } from "@zhk/db/schema";
import { count, eq } from "drizzle-orm";
import { protectedProcedure } from "../index";

export const dashboardRouter = {
  stats: protectedProcedure.handler(async () => {
    const [totalProjectsR, totalApartmentsR, freeApartmentsR, soldApartmentsR, totalBuildingsR, totalCommerceR] =
      await Promise.all([
        db.select({ value: count() }).from(projects),
        db.select({ value: count() }).from(apartments),
        db.select({ value: count() }).from(apartments).where(eq(apartments.status, "free")),
        db.select({ value: count() }).from(apartments).where(eq(apartments.status, "sold")),
        db.select({ value: count() }).from(buildings),
        db.select({ value: count() }).from(commerce),
      ]);

    return {
      totalProjects: totalProjectsR[0]!.value,
      totalApartments: totalApartmentsR[0]!.value,
      freeApartments: freeApartmentsR[0]!.value,
      soldApartments: soldApartmentsR[0]!.value,
      totalBuildings: totalBuildingsR[0]!.value,
      totalCommerce: totalCommerceR[0]!.value,
    };
  }),
};
