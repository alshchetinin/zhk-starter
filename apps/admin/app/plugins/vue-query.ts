import type { VueQueryPluginOptions } from "@tanstack/vue-query";
import { MutationCache, QueryCache, QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClient } from "@tanstack/query-persist-client-core";
import { del, get, set } from "idb-keyval";
import { formatApiError } from "~/utils/format-error";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export default defineNuxtPlugin({
  name: "vue-query",
  setup(nuxt) {
    const toast = useToast();

    const onError = (error: Error) => {
      toast.add({ title: "Ошибка", description: formatApiError(error), color: "error", duration: 0 });
    };

    const queryClient = new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: {
          staleTime: MINUTE,
          gcTime: 7 * DAY,
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
        },
      },
    });

    if (import.meta.client) {
      const persister = createAsyncStoragePersister({
        storage: {
          getItem: (key) => get<string>(key).then((v) => v ?? null),
          setItem: (key, value) => set(key, value),
          removeItem: (key) => del(key),
        },
        key: "zhk-admin-query-cache",
        throttleTime: 1_000,
      });

      persistQueryClient({
        queryClient,
        persister,
        maxAge: 7 * DAY,
        buster: "v1",
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            if (query.state.status !== "success") return false;
            return query.queryKey[0] !== "dev";
          },
        },
      });
    }

    const pluginOpts: VueQueryPluginOptions = { queryClient };
    nuxt.vueApp.use(VueQueryPlugin, pluginOpts);
  },
});
