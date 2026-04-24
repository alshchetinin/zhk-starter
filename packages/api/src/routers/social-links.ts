import { z } from "zod";
import { db } from "@zhk/db";
import { socialLinks, SOCIAL_LINK_TYPES } from "@zhk/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "../index";

const typeSchema = z.enum(SOCIAL_LINK_TYPES);

const baseFields = {
  type: typeSchema,
  link: z.string().min(1),
  sortOrder: z.number().int().default(0),
};

export const socialLinksRouter = {
  list: protectedProcedure
    .input(z.object({ siteId: z.string().nullable() }))
    .handler(async ({ input }) => {
      return db.query.socialLinks.findMany({
        where: input.siteId === null
          ? isNull(socialLinks.siteId)
          : eq(socialLinks.siteId, input.siteId),
        orderBy: [asc(socialLinks.sortOrder), asc(socialLinks.createdAt)],
      });
    }),

  save: protectedProcedure
    .input(
      z.object({
        siteId: z.string().nullable(),
        items: z.array(z.object({ id: z.string().optional(), ...baseFields })),
      }),
    )
    .handler(async ({ input }) => {
      const scope = input.siteId === null
        ? isNull(socialLinks.siteId)
        : eq(socialLinks.siteId, input.siteId);

      await db.transaction(async (tx) => {
        await tx.delete(socialLinks).where(scope);
        if (input.items.length) {
          await tx.insert(socialLinks).values(
            input.items.map((item, i) => ({
              siteId: input.siteId,
              type: item.type,
              link: item.link,
              sortOrder: item.sortOrder ?? i,
            })),
          );
        }
      });

      return db.query.socialLinks.findMany({
        where: scope,
        orderBy: [asc(socialLinks.sortOrder), asc(socialLinks.createdAt)],
      });
    }),
};
