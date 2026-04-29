import tailwindcss from "@tailwindcss/vite";
import themeFont from "./app/theme.generated.json";

export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  devServer: { port: 3001, host: "0.0.0.0" },

  modules: ["reka-ui/nuxt", "@nuxt/fonts", "@nuxt/icon", "@vueuse/nuxt", "motion-v/nuxt"],

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
  },

  fonts: {
    families: [
      {
        name: themeFont.fontSans,
        provider: themeFont.fontProvider,
        weights: themeFont.fontWeights,
      },
      ...(themeFont.fontDisplay !== themeFont.fontSans
        ? [
            {
              name: themeFont.fontDisplay,
              provider: themeFont.fontProvider,
              weights: themeFont.fontWeights,
            },
          ]
        : []),
    ],
  },

  icon: {
    serverBundle: "local",
  },

  components: [{ path: "~/components", pathPrefix: false }],

  runtimeConfig: {
    public: {
      serverUrl: process.env.NUXT_PUBLIC_SERVER_URL,
      adminOrigin: process.env.NUXT_PUBLIC_ADMIN_ORIGIN || "http://localhost:3002",
      yandexMapsApiKey: process.env.NUXT_PUBLIC_YANDEX_MAPS_API_KEY || "fa877110-09bd-449b-9c85-81f0d87b64e3",
      metrikaDev: process.env.NUXT_PUBLIC_METRIKA_DEV === "true",
    },
  },

  ssr: true,
});
