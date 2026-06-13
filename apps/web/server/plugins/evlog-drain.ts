import { createSentryDrain } from "evlog/sentry";

// Серверная сторона Nuxt (Nitro): получает клиентские (source:'client') и серверные события
// и дренит их в GlitchTip, если задан DSN. Пусто → только console.
export default defineNitroPlugin((nitroApp) => {
  const dsn = process.env.GLITCHTIP_DSN;
  if (!dsn) return;
  nitroApp.hooks.hook("evlog:drain", createSentryDrain({ dsn }));
});
