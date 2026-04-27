import { db } from "@zhk/db";
import { homepage } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { publicActiveSiteProcedure } from "../../index";
import { enrichContentBlocks } from "./utils";
import type { ContentBlock } from "../../shared/blocks";

export const publicHomepageRouter = {
  get: publicActiveSiteProcedure.handler(async ({ context }) => {
    const record = await db.query.homepage.findFirst({
      where: eq(homepage.siteId, context.siteId),
    });
    if (!record) return null;

    const enriched = await enrichContentBlocks(
      (record.contentBlocks ?? []) as ContentBlock[],
    );

    return {
      ...record,
      contentBlocks: enriched,
    };
  }),
};
