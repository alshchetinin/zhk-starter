import { z } from "zod";
import { db } from "@zhk/db";
import { homepage } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../index";
import { contentBlocksSchema } from "../shared/blocks";

const saveInput = z.object({
  contentBlocks: contentBlocksSchema.default([]),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
});

export const homepageRouter = {
  get: protectedProcedure.handler(async () => {
    const record = await db.query.homepage.findFirst();
    return record ?? null;
  }),

  save: protectedProcedure.input(saveInput).handler(async ({ input }) => {
    const data = {
      contentBlocks: input.contentBlocks,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      ogImage: input.ogImage ?? null,
    };

    const existing = await db.query.homepage.findFirst();

    if (existing) {
      const [updated] = await db
        .update(homepage)
        .set(data)
        .where(eq(homepage.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(homepage)
      .values(data)
      .returning();
    return created;
  }),
};
