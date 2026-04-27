import type { AppRouterClient } from "@zhk/api/routers/index";
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
