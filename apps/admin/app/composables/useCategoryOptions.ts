import { useQuery } from "@tanstack/vue-query";

export const CATEGORY_NONE = "_none";

export function useCategoryOptions() {
  const { $orpc } = useNuxtApp();

  const { data: categoriesData } = useQuery(
    computed(() => $orpc.pageCategories.list.queryOptions()),
  );

  const options = computed(() => [
    { label: "Без категории", value: CATEGORY_NONE },
    ...(categoriesData.value?.map((c) => ({ label: c.title, value: c.id })) ?? []),
  ]);

  return { options };
}
