import { env } from "@zhk/env/server";
import { initSentry } from "./sentry";

// Вызывается один раз на старте серверного процесса. Идемпотентно (initSentry
// сам no-op при повторном вызове / без DSN). `service` оставлен для совместимости
// сигнатуры с вызывающим кодом (@sentry/node не требует имени сервиса).
export function initObservability(_service?: string): void {
  initSentry(env.GLITCHTIP_DSN);
}
