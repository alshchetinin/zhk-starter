import { z } from "zod";
import { defineReceiver } from "./_core";

export const emailConfigSchema = z.object({
  to: z.string().email(),
  subject: z.string().optional(),
});

export type EmailConfig = z.infer<typeof emailConfigSchema>;

export const emailReceiver = defineReceiver<EmailConfig>({
  type: "email",
  label: "Email",
  icon: "i-solar-letter-linear",
  description: "Письмо на адрес (через платформенный SMTP)",
  configSchema: emailConfigSchema,
  defaultConfig: { to: "" },
});
