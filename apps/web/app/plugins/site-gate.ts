export default defineNuxtPlugin({
  name: "site-gate",
  dependsOn: ["orpc"],
  async setup() {
    const { $orpcClient } = useNuxtApp();
    const gate = useSiteGate();
    if (gate.value) return;

    try {
      const status = await $orpcClient.public.site.status();
      gate.value = status;
    } catch (err) {
      const e = err as { code?: string; status?: number; statusCode?: number };
      const notFound =
        e?.code === "NOT_FOUND" || e?.status === 404 || e?.statusCode === 404;
      if (notFound) {
        throw createError({
          statusCode: 404,
          statusMessage: "Сайт не найден",
          fatal: true,
        });
      }
      // прочие ошибки (например, временная недоступность API) — деградация
      gate.value = null;
    }
  },
});
