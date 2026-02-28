import type { AppRouterClient } from "@zhk/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

export default defineNuxtPlugin({
  dependsOn: ["vue-query"],
  setup() {
    const config = useRuntimeConfig();
    const rpcLink = new RPCLink({
      url: `${config.public.serverUrl}/rpc`,
      fetch(url, fetchOpts) {
        return fetch(url, { ...fetchOpts, credentials: "include" });
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
