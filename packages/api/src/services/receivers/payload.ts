import type { tickets } from "@zhk/db/schema";
import type { DeliveryContext } from "../../shared/receivers";
import { ticketDisplayFields } from "../../shared/ticket-fields";

type TicketRow = typeof tickets.$inferSelect;

export function buildDeliveryContext(
  ticket: TicketRow,
  site: { id: string; name: string },
): DeliveryContext {
  const fields = ticketDisplayFields(ticket).map((f) => ({ label: f.label, value: f.value }));

  return {
    ticket: {
      id: ticket.id,
      name: ticket.name ?? null,
      phone: ticket.phone ?? null,
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
