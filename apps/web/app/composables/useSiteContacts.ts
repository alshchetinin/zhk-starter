import { useQuery } from "@tanstack/vue-query";

export function useSiteContacts() {
  const { orpc } = useOrpc();
  const query = useQuery(orpc.public.contacts.layout.queryOptions());

  const header = computed(() => query.data.value?.header ?? []);
  const footer = computed(() => query.data.value?.footer ?? []);

  return {
    header,
    footer,
    isPending: query.isPending,
    suspense: query.suspense,
  };
}
