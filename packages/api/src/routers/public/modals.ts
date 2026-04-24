import { z } from "zod";
import { db } from "@zhk/db";
import { modals } from "@zhk/db/schema";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { publicSiteProcedure } from "../../index";

export const publicModalsRouter = {
  getBySlug: publicSiteProcedure
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input, context }) => {
      const item = await db.query.modals.findFirst({
        where: and(
          eq(modals.slug, input.slug),
          eq(modals.status, "published"),
          eq(modals.siteId, context.siteId),
        ),
        columns: {
          title: true,
          description: true,
          image: true,
          successMessage: true,
          fields: true,
        },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Modal not found" });
      }
      return item;
    }),
};
