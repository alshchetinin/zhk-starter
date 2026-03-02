import { db } from "@zhk/db";
import { publicProcedure } from "../../index";
import { enrichContentBlocks } from "./utils";
import type { ContentBlock } from "../../shared/blocks";

export const publicHomepageRouter = {
  get: publicProcedure.handler(async () => {
    const record = await db.query.homepage.findFirst();
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
