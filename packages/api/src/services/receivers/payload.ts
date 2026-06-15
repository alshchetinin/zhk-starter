import type { tickets } from "@zhk/db/schema";
import type { DeliveryContext } from "../../shared/receivers";

type TicketRow = typeof tickets.$inferSelect;

export function buildDeliveryContext(
  ticket: TicketRow,
  site: { id: string; name: string },
): DeliveryContext {
  const fields: Array<{ label: string; value: string }> = [];
  if (ticket.name) fields.push({ label: "Имя", value: ticket.name });
  fields.push({ label: "Телефон", value: ticket.phone });
  if (ticket.email) fields.push({ label: "Email", value: ticket.email });
  if (ticket.message) fields.push({ label: "Сообщение", value: ticket.message });

  return {
    ticket: {
      id: ticket.id,
      name: ticket.name ?? null,
      phone: ticket.phone,
      email: ticket.email ?? null,
      message: ticket.message ?? null,
      type: ticket.type,
      source: ticket.source ?? null,
      url: ticket.url ?? null,
      createdAt: ticket.createdAt.toISOString(),
    },
    utm: (ticket.utm as Record<string, string> | null) ?? null,
    site,
    fields,
  };
}
