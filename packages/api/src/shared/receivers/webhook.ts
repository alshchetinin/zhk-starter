import { z } from "zod";
import { defineReceiver } from "./_core";

export const webhookConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(["POST", "PUT"]).default("POST"),
  headers: z.record(z.string(), z.string()).optional(),
  secret: z.string().optional(),
});

export type WebhookConfig = z.infer<typeof webhookConfigSchema>;

export const webhookReceiver = defineReceiver<WebhookConfig>({
  type: "webhook",
  label: "Webhook",
  icon: "i-solar-link-circle-linear",
  description: "POST JSON с данными заявки на ваш URL",
  configSchema: webhookConfigSchema,
  defaultConfig: { url: "", method: "POST" },
});
