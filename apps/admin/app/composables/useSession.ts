export function useSession() {
  const { $authClient } = useNuxtApp();
  const session = $authClient.useSession();
  const user = computed(() => session.value?.data?.user ?? null);
  const isLoggedIn = computed(() => !!user.value);
  const isPending = computed(() => session.value?.isPending ?? true);

  return { session, user, isLoggedIn, isPending };
}
