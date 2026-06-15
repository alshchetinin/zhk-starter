import type { z } from "zod";

/** Стабильный контракт, который получает каждый приёмщик. */
export interface DeliveryContext {
  ticket: {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    message: string | null;
    type: string;
    source: string | null;
    url: string | null;
    createdAt: string;
  };
  utm: Record<string, string> | null;
  site: { id: string; name: string };
  /** Человекочитаемые поля (label/value) — для форматирования Telegram/email. */
  fields: Array<{ label: string; value: string }>;
}

export type DeliveryResult = { ok: true } | { ok: false; error: string };

export type Deliverer<C = unknown> = (
  ctx: DeliveryContext,
  config: C,
) => Promise<DeliveryResult>;

export interface ReceiverDefinition<C = unknown> {
  type: string;
  label: string;
  icon: string;
  description: string;
  configSchema: z.ZodType<C>;
  defaultConfig: C;
}

export function defineReceiver<C>(
  def: ReceiverDefinition<C>,
): ReceiverDefinition<C> {
  return def;
}
