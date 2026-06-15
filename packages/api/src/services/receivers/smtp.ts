import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@zhk/env/server";

let cached: Transporter | null | undefined;

/** Возвращает singleton-транспорт или null, если SMTP не сконфигурен. */
export function getMailer(): Transporter | null {
  if (cached !== undefined) return cached;
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    cached = null;
    return cached;
  }
  cached = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return cached;
}

export function getFrom(): string {
  return env.SMTP_FROM || env.SMTP_USER || "no-reply@localhost";
}
