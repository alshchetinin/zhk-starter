import { db } from "@zhk/db";
import { formDeliveries, formReceivers, tickets } from "@zhk/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { receiverDefByType } from "../../shared/receivers";
import { deliverers } from "./index";
import { buildDeliveryContext } from "./payload";

/** Создаёт pending-строки доставки на каждый приёмщик. Возвращает их id. */
export async function createPendingDeliveries(
  ticketId: string,
  receivers: Array<{ id: string; type: string; name: string }>,
): Promise<string[]> {
  if (receivers.length === 0) return [];
  const rows = await db
    .insert(formDeliveries)
    .values(
      receivers.map((r) => ({
        ticketId,
        receiverId: r.id,
        receiverType: r.type,
        receiverName: r.name,
        status: "pending" as const,
      })),
    )
    .returning({ id: formDeliveries.id });
  return rows.map((r) => r.id);
}

/**
 * Прогоняет доставку: берёт строки в статусах pending/error (или указанные deliveryIds),
 * вызывает deliverer по типу приёмщика, обновляет статус. Идемпотентно и переиспользуется ретраем.
 */
export async function processTicketDeliveries(
  ticketId: string,
  deliveryIds?: string[],
): Promise<void> {
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket) return;

  const site = await db.query.sites.findFirst({
    where: (s, { eq: e }) => e(s.id, ticket.siteId),
    columns: { id: true, name: true },
  });
  const ctx = buildDeliveryContext(ticket, {
    id: ticket.siteId,
    name: site?.name ?? "",
  });

  const rows = await db.query.formDeliveries.findMany({
    where: deliveryIds
      ? and(eq(formDeliveries.ticketId, ticketId), inArray(formDeliveries.id, deliveryIds))
      : and(
          eq(formDeliveries.ticketId, ticketId),
          inArray(formDeliveries.status, ["pending", "error"]),
        ),
  });

  await Promise.allSettled(
    rows.map(async (row) => {
      const receiver = row.receiverId
        ? await db.query.formReceivers.findFirst({ where: eq(formReceivers.id, row.receiverId) })
        : null;
      const deliverer = deliverers[row.receiverType];
      let result: { ok: boolean; error?: string };
      if (!receiver || !receiver.enabled) {
        result = { ok: false, error: "Приёмщик удалён или выключен" };
      } else if (!deliverer) {
        result = { ok: false, error: `Нет обработчика для типа ${row.receiverType}` };
      } else {
        const def = receiverDefByType.get(row.receiverType);
        const config = def ? def.configSchema.parse(receiver.config) : receiver.config;
        result = await deliverer(ctx, config);
      }
      await db
        .update(formDeliveries)
        .set({
          status: result.ok ? "ok" : "error",
          error: result.ok ? null : (result.error ?? "Неизвестная ошибка"),
          attempts: row.attempts + 1,
          lastAttemptAt: new Date(),
        })
        .where(eq(formDeliveries.id, row.id));
    }),
  );
}
