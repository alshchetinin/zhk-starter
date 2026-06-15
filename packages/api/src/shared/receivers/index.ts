import type { ReceiverDefinition } from "./_core";
import { webhookReceiver } from "./webhook";
import { telegramReceiver } from "./telegram";
import { emailReceiver } from "./email";

export { defineReceiver } from "./_core";
export type { ReceiverDefinition, DeliveryContext, DeliveryResult, Deliverer } from "./_core";
export type { WebhookConfig } from "./webhook";
export type { TelegramConfig } from "./telegram";
export type { EmailConfig } from "./email";

export const allReceivers = [
  webhookReceiver,
  telegramReceiver,
  emailReceiver,
] as const satisfies readonly ReceiverDefinition[];

export const receiverDefByType = new Map<string, ReceiverDefinition>(
  allReceivers.map((r) => [r.type, r]),
);

export const receiverTypes = allReceivers.map((r) => r.type);

export interface ReceiverPickerEntry {
  type: string;
  label: string;
  icon: string;
  description: string;
}

export const receiverDefinitions: ReceiverPickerEntry[] = allReceivers.map((r) => ({
  type: r.type,
  label: r.label,
  icon: r.icon,
  description: r.description,
}));

/** Валидирует и нормализует config приёмщика по его типу. Кидает при неизвестном типе/невалидном config. */
export function parseReceiverConfig(type: string, config: unknown): Record<string, unknown> {
  const def = receiverDefByType.get(type);
  if (!def) throw new Error(`Unknown receiver type: ${type}`);
  return def.configSchema.parse(config) as Record<string, unknown>;
}

export function getReceiverDefaultConfig(type: string): Record<string, unknown> {
  const def = receiverDefByType.get(type);
  if (!def) throw new Error(`Unknown receiver type: ${type}`);
  return structuredClone(def.defaultConfig) as Record<string, unknown>;
}
