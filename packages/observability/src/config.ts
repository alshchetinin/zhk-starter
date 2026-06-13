import { initLogger } from "evlog";
import { env } from "@zhk/env/server";
import { initSentry, createObservabilityDrain } from "./sentry";

let initialized = false;

// Вызывается один раз на старте серверного процесса. Идемпотентно.
export function initObservability(service: string) {
  if (initialized) return;
  initialized = true;

  const dsn = env.GLITCHTIP_DSN;
  // Путь B: @sentry/node для Issues (неожиданные ошибки). No-op без DSN.
  initSentry(dsn);

  initLogger({
    env: {
      service,
      environment: process.env.NODE_ENV ?? "development",
    },
    redact: {
      // Поля-секреты/PII по имени (полная редакция). Значения email/phone/JWT и т.п.
      // дополнительно частично маскируются встроенными паттернами evlog по умолчанию.
      paths: ["password", "accessPassword", "*_token", "phone"],
    },
    // Композитный drain: evlog→Logs (createSentryDrain) + Sentry Issues для
    // неожиданных ошибок. Без DSN — drain отсутствует (console-only).
    drain: dsn ? createObservabilityDrain(dsn) : undefined,
  });
}
