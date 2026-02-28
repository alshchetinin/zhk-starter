export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  devServer: { port: 3002, host: "0.0.0.0" },
  runtimeConfig: {
    public: {
      serverUrl: process.env.NUXT_PUBLIC_SERVER_URL,
    },
  },
  ssr: false,
});
