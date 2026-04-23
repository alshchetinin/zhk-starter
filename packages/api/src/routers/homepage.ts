import { z } from "zod";
import { db } from "@zhk/db";
import { homepage } from "@zhk/db/schema";
import { and, eq } from "drizzle-orm";
import { siteProcedure } from "../index";
import { contentBlocksSchema } from "../shared/blocks";

const saveInput = z.object({
  contentBlocks: contentBlocksSchema.default([]),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
});

export const homepageRouter = {
  get: siteProcedure.handler(async ({ context }) => {
    const record = await db.query.homepage.findFirst({
      where: eq(homepage.siteId, context.siteId),
    });
    return record ?? null;
  }),

  save: siteProcedure.input(saveInput).handler(async ({ input, context }) => {
    const data = {
      contentBlocks: input.contentBlocks,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      ogImage: input.ogImage ?? null,
    };

    const existing = await db.query.homepage.findFirst({
      where: eq(homepage.siteId, context.siteId),
    });

    if (existing) {
      const [updated] = await db
        .update(homepage)
        .set(data)
        .where(and(eq(homepage.id, existing.id), eq(homepage.siteId, context.siteId)))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(homepage)
      .values({ ...data, siteId: context.siteId })
      .returning();
    return created;
  }),
};
