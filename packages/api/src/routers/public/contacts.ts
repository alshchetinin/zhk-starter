import { db } from "@zhk/db";
import { contacts } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { publicSiteProcedure } from "../../index";

export const publicContactsRouter = {
  get: publicSiteProcedure.handler(async ({ context }) => {
    const record = await db.query.contacts.findFirst({
      where: eq(contacts.siteId, context.siteId),
    });
    return record ?? null;
  }),
};
