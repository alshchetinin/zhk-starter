import { z } from "zod";
import { db } from "@zhk/db";
import { projects } from "@zhk/db/schema";
import { count, eq, ne, and } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { publicActiveSiteProcedure, publicReadProcedure } from "../../index";
import { paginationInput, calcOffset } from "../../shared/pagination";

export const publicProjectsRouter = {
  list: publicReadProcedure
    .input(paginationInput)
    .handler(async ({ input }) => {
      const { page, pageSize } = input;
      const where = ne(projects.status, "hidden");

      const [data, countResult] = await Promise.all([
        db.query.projects.findMany({
          where,
          limit: pageSize,
          offset: calcOffset(page, pageSize),
          with: { city: true, buildings: { columns: { id: true, name: true } } },
          orderBy: (p, { desc }) => [desc(p.createdAt)],
        }),
        db.select({ total: count() }).from(projects).where(where),
      ]);

      return { data, total: countResult[0]!.total, page, pageSize };
    }),

  getById: publicActiveSiteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.id), ne(projects.status, "hidden")),
        with: { city: true, buildings: true },
      });
      if (!project) {
        throw new ORPCError("NOT_FOUND", { message: "Project not found" });
      }
      return project;
    }),
};
