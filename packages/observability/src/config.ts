import { initLogger } from "evlog";
import { createSentryDrain } from "evlog/sentry";
import { env } from "@zhk/env/server";

let initialized = false;

// Вызывается один раз на старте серверного процесса. Идемпотентно.
export function initObservability(service: string) {
  if (initialized) return;
  initialized = true;

  const dsn = env.GLITCHTIP_DSN;
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
    drain: dsn ? createSentryDrain({ dsn }) : undefined,
  });
}
