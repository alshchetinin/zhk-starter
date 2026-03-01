import type { VueQueryPluginOptions } from "@tanstack/vue-query";
import { MutationCache, QueryCache, QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { formatApiError } from "~/utils/format-error";

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
          staleTime: 30_000,
          refetchOnWindowFocus: "always",
        },
      },
    });

    const pluginOpts: VueQueryPluginOptions = { queryClient };
    nuxt.vueApp.use(VueQueryPlugin, pluginOpts);
  },
});
