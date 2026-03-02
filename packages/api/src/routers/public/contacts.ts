import { db } from "@zhk/db";
import { publicProcedure } from "../../index";

export const publicContactsRouter = {
  get: publicProcedure.handler(async () => {
    const record = await db.query.contacts.findFirst();
    return record ?? null;
  }),
};
