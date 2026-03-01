export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  devServer: { port: 3002, host: "0.0.0.0" },
  modules: ["@nuxt/ui", "@vueuse/nuxt"],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      serverUrl: process.env.NUXT_PUBLIC_SERVER_URL || "http://localhost:3000",
      yandexMapsApiKey: process.env.NUXT_PUBLIC_YANDEX_MAPS_API_KEY || "fa877110-09bd-449b-9c85-81f0d87b64e3",
    },
  },
  ssr: false,
  components: [
    { path: "~/components", pathPrefix: false },
  ],
});