import { initSentry, createObservabilityDrain } from "@zhk/observability";

// Серверная сторона Nuxt (Nitro): получает клиентские (source:'client') и серверные события
// и дренит их в GlitchTip, если задан DSN. Пусто → только console.
//
// Композитный drain: evlog→Logs (createSentryDrain) + Sentry Issues для
// неожиданных ошибок (путь B). DSN живёт только на сервере (Nitro), не в браузере.
export default defineNitroPlugin((nitroApp) => {
  const dsn = process.env.GLITCHTIP_DSN;
  if (!dsn) return;
  initSentry(dsn);
  nitroApp.hooks.hook("evlog:drain", createObservabilityDrain(dsn));
});
