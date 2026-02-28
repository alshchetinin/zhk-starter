import type { VueQueryPluginOptions } from "@tanstack/vue-query";
import { MutationCache, QueryCache, QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

export default defineNuxtPlugin({
  name: "vue-query",
  setup(nuxt) {
    const toast = useToast();

    const queryClient = new QueryClient({
      queryCache: new QueryCache({
        onError: (error) => {
          toast.add({ title: "Error", description: String(error.message), color: "error" });
        },
      }),
      mutationCache: new MutationCache({
        onError: (error) => {
          toast.add({ title: "Error", description: String(error.message), color: "error" });
        },
      }),
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
