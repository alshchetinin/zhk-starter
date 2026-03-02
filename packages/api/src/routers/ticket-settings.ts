import { z } from "zod";
import { db } from "@zhk/db";
import { ticketSettings } from "@zhk/db/schema";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "../index";

const saveInput = z.object({
  telegramBotToken: z.string().optional(),
  telegramChatId: z.string().optional(),
});

export const ticketSettingsRouter = {
  get: protectedProcedure.handler(async () => {
    const record = await db.query.ticketSettings.findFirst();
    return record ?? null;
  }),

  save: protectedProcedure.input(saveInput).handler(async ({ input }) => {
    const data = {
      telegramBotToken: input.telegramBotToken || null,
      telegramChatId: input.telegramChatId || null,
    };

    const existing = await db.query.ticketSettings.findFirst();

    if (existing) {
      const [updated] = await db
        .update(ticketSettings)
        .set(data)
        .where(eq(ticketSettings.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(ticketSettings)
      .values(data)
      .returning();
    return created;
  }),
};
