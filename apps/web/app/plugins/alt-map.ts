export default defineNuxtPlugin({
  name: "alt-map",
  dependsOn: ["orpc"],
  async setup() {
    const { $orpcClient } = useNuxtApp();
    const map = useAltMap();
    if (Object.keys(map.value).length) return;
    try {
      map.value = await $orpcClient.media.altMap();
    } catch {
      // fail-soft: без карты alt деградирует к fallback рендерера
      map.value = {};
    }
  },
});
