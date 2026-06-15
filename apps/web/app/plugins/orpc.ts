import type { AppRouterClient } from "@zhk/api/routers/index";
import { extractUnlockToken, SITE_UNLOCK_HEADER } from "@zhk/api/shared/site-gate";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

export default defineNuxtPlugin({
  name: "orpc",
  dependsOn: ["vue-query"],
  setup() {
    const config = useRuntimeConfig();
    const requestHeaders = import.meta.server
      ? useRequestHeaders(["host", "cookie"])
      : ({} as Record<string, string | undefined>);

    // Токен анлока сайта: на SSR достаём из куки (web-origin), кладём в state
    // (сериализуется в клиент). На клиенте кросс-доменный fetch в API куку не
    // несёт — дублируем токен заголовком x-site-unlock. См. @zhk/api/shared/site-gate.
    const unlockToken = useState<string | null>("siteUnlockToken", () => null);
    if (import.meta.server) {
      unlockToken.value = extractUnlockToken(requestHeaders.cookie);
    }

    const rpcLink = new RPCLink({
      url: `${config.public.serverUrl}/rpc`,
      fetch(url, fetchOpts) {
        const headers = new Headers(fetchOpts?.headers);
        const host = import.meta.server
          ? requestHeaders.host
          : typeof window !== "undefined"
          ? window.location.host
          : undefined;
        if (host) headers.set("x-forwarded-host", host);
        if (import.meta.server && requestHeaders.cookie) {
          headers.set("cookie", requestHeaders.cookie);
        }
        if (unlockToken.value) headers.set(SITE_UNLOCK_HEADER, unlockToken.value);
        return fetch(url, {
          ...fetchOpts,
          headers,
          credentials: "include",
        });
      },
    });

    const client: AppRouterClient = createORPCClient(rpcLink);
    const orpcUtils = createTanstackQueryUtils(client);

    return {
      provide: {
        orpc: orpcUtils,
        orpcClient: client,
      },
    };
  },
});
