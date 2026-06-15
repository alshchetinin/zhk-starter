import type { Deliverer } from "../../shared/receivers";
import { deliverWebhook } from "./webhook";
import { deliverTelegram } from "./telegram";
import { deliverEmail } from "./email";

export const deliverers: Record<string, Deliverer> = {
  webhook: deliverWebhook as Deliverer,
  telegram: deliverTelegram as Deliverer,
  email: deliverEmail as Deliverer,
};

export { buildDeliveryContext } from "./payload";
export { resolveReceiverIds } from "./resolve";
export { processTicketDeliveries, createPendingDeliveries } from "./dispatch";
