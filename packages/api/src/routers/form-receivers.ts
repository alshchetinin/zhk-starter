import { z } from "zod";
import { db } from "@zhk/db";
import { formReceivers } from "@zhk/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";
import { parseReceiverConfig, receiverTypes } from "../shared/receivers";
import { deliverers, buildDeliveryContext } from "../services/receivers";

const typeSchema = z.enum(receiverTypes as [string, ...string[]]);

export const formReceiversRouter = {
  list: siteProcedure.handler(async ({ context }) => {
    return db.query.formReceivers.findMany({
      where: eq(formReceivers.siteId, context.siteId),
      orderBy: [asc(formReceivers.sortOrder), asc(formReceivers.createdAt)],
    });
  }),

  create: siteProcedure
    .input(
      z.object({
        type: typeSchema,
        name: z.string().min(1),
        config: z.record(z.string(), z.unknown()),
        enabled: z.boolean().default(true),
      }),
    )
    .handler(async ({ input, context }) => {
      let config: Record<string, unknown>;
      try {
        config = parseReceiverConfig(input.type, input.config);
      } catch {
        throw new ORPCError("BAD_REQUEST", { message: "Некорректная конфигурация приёмщика" });
      }
      const [created] = await db
        .insert(formReceivers)
        .values({ siteId: context.siteId, type: input.type, name: input.name, config, enabled: input.enabled })
        .returning();
      return created;
    }),

  update: siteProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        config: z.record(z.string(), z.unknown()).optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const existing = await db.query.formReceivers.findFirst({
        where: and(eq(formReceivers.id, input.id), eq(formReceivers.siteId, context.siteId)),
      });
      if (!existing) throw new ORPCError("NOT_FOUND", { message: "Приёмщик не найден" });

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.enabled !== undefined) updates.enabled = input.enabled;
      if (input.config !== undefined) {
        try {
          updates.config = parseReceiverConfig(existing.type, input.config);
        } catch {
          throw new ORPCError("BAD_REQUEST", { message: "Некорректная конфигурация приёмщика" });
        }
      }
      if (Object.keys(updates).length === 0) {
        return existing;
      }
      const [updated] = await db
        .update(formReceivers)
        .set(updates)
        .where(and(eq(formReceivers.id, input.id), eq(formReceivers.siteId, context.siteId)))
        .returning();
      return updated;
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const deleted = await db
        .delete(formReceivers)
        .where(and(eq(formReceivers.id, input.id), eq(formReceivers.siteId, context.siteId)))
        .returning({ id: formReceivers.id });
      if (!deleted.length) throw new ORPCError("NOT_FOUND", { message: "Приёмщик не найден" });
      return { success: true };
    }),

  reorder: siteProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .handler(async ({ input, context }) => {
      await db.transaction(async (tx) => {
        for (let i = 0; i < input.ids.length; i++) {
          await tx
            .update(formReceivers)
            .set({ sortOrder: i })
            .where(and(eq(formReceivers.id, input.ids[i]!), eq(formReceivers.siteId, context.siteId)));
        }
      });
      return { success: true };
    }),

  test: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const receiver = await db.query.formReceivers.findFirst({
        where: and(eq(formReceivers.id, input.id), eq(formReceivers.siteId, context.siteId)),
      });
      if (!receiver) throw new ORPCError("NOT_FOUND", { message: "Приёмщик не найден" });
      const deliverer = deliverers[receiver.type];
      if (!deliverer) throw new ORPCError("BAD_REQUEST", { message: "Нет обработчика для типа" });

      const config = parseReceiverConfig(receiver.type, receiver.config);
      const ctx = buildDeliveryContext(
        {
          id: "test",
          name: "Тест",
          phone: "+7 000 000-00-00",
          email: "test@example.com",
          message: "Это тестовая заявка из админки.",
          type: "lead",
          source: "test",
          url: null,
          utm: null,
          createdAt: new Date(),
        } as never,
        { id: context.siteId, name: context.site?.name ?? "" },
      );
      const result = await deliverer(ctx, config);
      return result;
    }),
};
