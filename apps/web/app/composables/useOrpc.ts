export function useOrpc() {
  const { $orpc, $orpcClient } = useNuxtApp();
  return { orpc: $orpc, client: $orpcClient };
}
