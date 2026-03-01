import { useQuery } from "@tanstack/vue-query";

export const PROJECT_NONE = "_none";

export function useProjectOptions() {
  const { $orpc } = useNuxtApp();

  const { data: projectsData } = useQuery(
    computed(() => $orpc.projects.list.queryOptions({
      input: { page: 1, pageSize: 100 },
    })),
  );

  const options = computed(() => [
    { label: "Без проекта", value: PROJECT_NONE },
    ...(projectsData.value?.data.map(p => ({ label: p.name, value: p.id })) ?? []),
  ]);

  return { options };
}
