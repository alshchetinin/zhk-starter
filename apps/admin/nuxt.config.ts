export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  devServer: { port: 3002, host: "0.0.0.0" },
  modules: ["@nuxt/ui", "@vueuse/nuxt", "@sentry/nuxt/module"],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      serverUrl: process.env.NUXT_PUBLIC_SERVER_URL || "http://localhost:3000",
      webOrigin: process.env.NUXT_PUBLIC_WEB_ORIGIN || "http://localhost:3001",
      yandexMapsApiKey: process.env.NUXT_PUBLIC_YANDEX_MAPS_API_KEY || "fa877110-09bd-449b-9c85-81f0d87b64e3",
      // DSN для sentry.client.config.ts (Sentry.init читает его из public runtimeConfig).
      // Пусто → SDK не инициализируется (no-op). См. sentry.client/server.config.ts.
      sentry: {
        dsn: process.env.GLITCHTIP_DSN || "",
      },
    },
  },

  // Source-map upload отключён: self-hosted GlitchTip, без auth-токена сборку не валим.
  sentry: {
    sourcemaps: { disable: true },
  },

  ssr: false,
  components: [
    { path: "~/components", pathPrefix: false },
  ],
});