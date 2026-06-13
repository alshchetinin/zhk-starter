import * as Sentry from "@sentry/nuxt";

// Серверный (Nitro) SDK админки. Админка — SPA (ssr:false), серверных ошибок мало,
// но конфиг держим для полноты официального сетапа @sentry/nuxt. DSN из env.
// Пусто → no-op. Только error-issues (без tracing).
const dsn = process.env.GLITCHTIP_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    sendDefaultPii: false,
  });
}
