import { initSentry, captureUnexpected } from "@zhk/observability";

// Серверная сторона публичного сайта (Nitro/SSR): инициализирует @sentry/node
// и шлёт необработанные серверные ошибки в GlitchTip Issues. Браузерный SDK
// сознательно НЕ подключён — публичный сайт держим лёгким, DSN не утекает в браузер.
// No-op без GLITCHTIP_DSN.
export default defineNitroPlugin((nitroApp) => {
  if (!initSentry(process.env.GLITCHTIP_DSN)) return;

  // Nitro error hook: (error: Error, context) — серверные/SSR ошибки.
  // captureUnexpected сам фильтрует ожидаемые 4xx ORPCError.
  nitroApp.hooks.hook("error", (error) => {
    captureUnexpected(error, {});
  });
});
