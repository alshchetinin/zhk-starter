import { useQuery } from "@tanstack/vue-query";
import { SITE_COOKIE } from "@zhk/api/shared/constants";

export function useCurrentSite() {
  const { $orpc } = useNuxtApp();
  const cookie = useCookie<string | null>(SITE_COOKIE, {
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

  function setSite(id: string, navigateTo?: string) {
    cookie.value = id;
    if (typeof window !== "undefined") {
      window.location.href = navigateTo ?? window.location.pathname;
    }
  }

  return {
    sites,
    currentSite,
    currentSiteId: computed(() => currentSite.value?.id ?? null),
    setSite,
    isLoading: computed(() => sitesQuery.isLoading.value),
  };
}
