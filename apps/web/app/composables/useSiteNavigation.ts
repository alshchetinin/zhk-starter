import { useQuery } from "@tanstack/vue-query";

export function useSiteNavigation() {
  const { orpc } = useOrpc();
  const query = useQuery(orpc.public.navigation.layout.queryOptions());

  const header = computed(() => query.data.value?.header ?? []);
  const footer = computed(() => query.data.value?.footer ?? []);

  return {
    header,
    footer,
    isPending: query.isPending,
    suspense: query.suspense,
  };
}
