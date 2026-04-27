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
    } catch {
      gate.value = null;
    }
  },
});
