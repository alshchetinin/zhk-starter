import { useQuery } from "@tanstack/vue-query";
import type { MaybeRef } from "vue";

export function useProjectData(projectId: MaybeRef<string | null>) {
  const { $orpc } = useNuxtApp();

  const id = computed(() => toValue(projectId));

  return useQuery(
    computed(() => ({
      ...$orpc.projects.getById.queryOptions({ input: { id: id.value || "" } }),
      enabled: !!id.value,
    })),
  );
}
