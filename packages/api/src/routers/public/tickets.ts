import { z } from "zod";
import { db } from "@zhk/db";
import { tickets, ticketTypeEnum, modals, formReceivers } from "@zhk/db/schema";
import { and, eq } from "drizzle-orm";
import { publicActiveSiteProcedure } from "../../index";
import { rateLimit } from "../../middleware/rate-limit";
import { resolveReceiverIds, createPendingDeliveries, processTicketDeliveries } from "../../services/receivers";

/** Извлекает slug модалки из source вида "modal:{slug}". */
function modalSlugFromSource(source: string | undefined): string | null {
  if (!source) return null;
  const m = /^modal:(.+)$/.exec(source);
  return m ? m[1]! : null;
}

export const publicTicketsRouter = {
  create: publicActiveSiteProcedure
    .use(rateLimit("ticketCreate", { keyBy: "ip+site" }))
    .use(rateLimit("ticketCreateHourly", { keyBy: "ip+site" }))
    .use(rateLimit("ticketCreate", {
      keyBy: "ip+extra",
      extractExtra: (input) => (input as { phone?: string })?.phone,
    }))
    .input(
      z.object({
        name: z.string().optional(),
        phone: z.string().min(1),
        email: z.union([z.string().email(), z.literal("")]).optional(),
        message: z.string().optional(),
        type: z.enum(ticketTypeEnum.enumValues).default("lead"),
        source: z.string().optional(),
        url: z.string().optional(),
        utm: z.record(z.string(), z.string()).optional(),
        apartmentId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const siteId = context.siteId;

      const created = await db
        .insert(tickets)
        .values({
          siteId,
          name: input.name ?? null,
          phone: input.phone,
          email: input.email || null,
          message: input.message ?? null,
          type: input.type,
          source: input.source ?? null,
          url: input.url ?? null,
          utm: input.utm ?? null,
          apartmentId: input.apartmentId ?? null,
        })
        .returning()
        .then((r) => r[0]!);

      // Резолв приёмщиков: форма (модалка по slug) → её receiverIds, иначе все enabled.
      const enabled = await db.query.formReceivers.findMany({
        where: and(eq(formReceivers.siteId, siteId), eq(formReceivers.enabled, true)),
        orderBy: (r, { asc }) => [asc(r.sortOrder), asc(r.createdAt)],
      });

      const slug = modalSlugFromSource(input.source);
      const form = slug
        ? await db.query.modals.findFirst({
            where: and(eq(modals.siteId, siteId), eq(modals.slug, slug)),
            columns: { receiverIds: true },
          })
        : null;

      const targetIds = resolveReceiverIds(form ?? null, enabled);
      const targets = enabled.filter((r) => targetIds.includes(r.id));

      if (targets.length > 0) {
        const deliveryIds = await createPendingDeliveries(
          created.id,
          targets.map((r) => ({ id: r.id, type: r.type, name: r.name })),
        );
        // Фоновая доставка — не блокирует ответ. pending-строки уже в БД (durable).
        void processTicketDeliveries(created.id, deliveryIds);
      }

      return { success: true, id: created.id };
    }),
};
