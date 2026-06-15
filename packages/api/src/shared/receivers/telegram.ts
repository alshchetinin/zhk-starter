import { z } from "zod";
import { defineReceiver } from "./_core";

export const telegramConfigSchema = z.object({
  botToken: z.string().min(1),
  chatId: z.string().min(1),
});

export type TelegramConfig = z.infer<typeof telegramConfigSchema>;

export const telegramReceiver = defineReceiver<TelegramConfig>({
  type: "telegram",
  label: "Telegram",
  icon: "i-solar-plain-2-linear",
  description: "Уведомление в Telegram-чат через бота",
  configSchema: telegramConfigSchema,
  defaultConfig: { botToken: "", chatId: "" },
});
