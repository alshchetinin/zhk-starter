import { useQuery } from "@tanstack/vue-query";

export function useCurrentSite() {
  const { $orpc } = useNuxtApp();
  const cookie = useCookie<string | null>("zhk-site-id", {
    default: () => null,
    sameSite: "lax",
  });

  const sitesQuery = useQuery($orpc.sites.list.queryOptions());

  const sites = computed(() => sitesQuery.data.value ?? []);

  const currentSite = computed(() => {
    const list = sites.value;
    if (!list.length) return null;
    if (cookie.value) {
      const found = list.find((s) => s.id === cookie.value);
      if (found) return found;
    }
    return list.find((s) => s.isPrimary) ?? list[0] ?? null;
  });

  function setSite(id: string) {
    cookie.value = id;
    if (typeof window !== "undefined") window.location.reload();
  }

  return {
    sites,
    currentSite,
    currentSiteId: computed(() => currentSite.value?.id ?? null),
    setSite,
    isLoading: computed(() => sitesQuery.isLoading.value),
  };
}
