import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  devServer: { port: 3001, host: "0.0.0.0" },

  modules: ["reka-ui/nuxt", "@nuxt/fonts", "@nuxt/icon", "@vueuse/nuxt"],

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
  },

  fonts: {
    families: [
      {
        name: "Plus Jakarta Sans",
        provider: "google",
        weights: [400, 500, 600, 700],
      },
    ],
  },

  icon: {
    serverBundle: "local",
  },

  components: [{ path: "~/components", pathPrefix: false }],

  runtimeConfig: {
    public: {
      serverUrl: process.env.NUXT_PUBLIC_SERVER_URL,
    },
  },

  ssr: true,
});
