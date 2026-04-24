import { useQuery } from "@tanstack/vue-query";

export function useSiteContacts() {
  const { orpc } = useOrpc();
  const query = useQuery(orpc.public.contacts.layout.queryOptions());

  const header = computed(() => query.data.value?.header ?? []);
  const footer = computed(() => query.data.value?.footer ?? []);
  const socials = computed(() => query.data.value?.socials ?? []);

  return {
    header,
    footer,
    socials,
    isPending: query.isPending,
    suspense: query.suspense,
  };
}
