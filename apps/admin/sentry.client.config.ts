import * as Sentry from "@sentry/nuxt";

// Браузерный SDK админки. DSN берётся из public runtimeConfig (см. nuxt.config.ts).
// Пусто → Sentry.init с пустым dsn = no-op (события никуда не уходят).
// Только error-issues: tracing/replay не включаем (tracesSampleRate не задаём).
const dsn = useRuntimeConfig().public.sentry?.dsn;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.dev ? "development" : "production",
    sendDefaultPii: false,
  });
}
