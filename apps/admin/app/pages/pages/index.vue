<script setup lang="ts">
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const page = ref(1);
const pageSize = 20;
const search = ref("");
const debouncedSearch = refDebounced(search, 300);
const statusFilter = ref<PageStatus>();
const categoryFilter = ref<string>("");
const categoriesModalOpen = ref(false);

const { data: categoriesData } = useQuery(
  computed(() => $orpc.pageCategories.list.queryOptions()),
);
const categoryFilterItems = computed(() => [
  { label: "Все категории", value: "" },
  ...(categoriesData.value?.map((c) => ({ label: c.title, value: c.id })) ?? []),
]);

const { data, isPending } = useQuery(
  computed(() => ({
    ...$orpc.pages.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        search: debouncedSearch.value || undefined,
        status: statusFilter.value,
        categoryId: categoryFilter.value || undefined,
      },
    }),
    placeholderData: keepPreviousData,
  })),
);

function prefetchPage(id: string) {
  queryClient.prefetchQuery($orpc.pages.getById.queryOptions({ input: { id } }));
}

watch([debouncedSearch, statusFilter, categoryFilter], () => {
  page.value = 1;
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.pages.delete({ id }),
  onMutate: async (id) => {
    const listKey = $orpc.pages.list.key();
    await queryClient.cancelQueries({ queryKey: listKey });
    const snapshots = queryClient.getQueriesData({ queryKey: listKey });
    queryClient.setQueriesData({ queryKey: listKey }, (old: any) => {
      if (!old?.data) return old;
      return { ...old, data: old.data.filter((p: any) => p.id !== id), total: Math.max(0, (old.total ?? 0) - 1) };
    });
    return { snapshots };
  },
  onError: (_err, _id, ctx) => {
    if (!ctx) return;
    for (const [key, data] of ctx.snapshots) queryClient.setQueryData(key, data);
  },
  onSuccess: () => {
    toast.add({ title: "Страница удалена", color: "success" });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: $orpc.pages.key() });
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Страницы"
      :subtitle="data?.total != null ? `${data.total} страниц` : undefined"
    >
      <template #actions>
        <UButton
          variant="outline"
          icon="i-solar-folder-with-files-linear"
          @click="categoriesModalOpen = true"
        >
          Категории
        </UButton>
        <UButton to="/pages/create" icon="i-solar-add-square-linear" color="primary">
          Новая страница
        </UButton>
      </template>
    </AppPageHeader>

    <div class="mb-4 flex items-center gap-2">
      <UInput v-model="search" placeholder="Поиск…" icon="i-solar-magnifer-linear" size="sm" class="max-w-xs" />
      <USelect v-model="statusFilter" :items="pageStatusOptions" placeholder="Все статусы" size="sm" class="max-w-[200px]" />
      <USelect v-model="categoryFilter" :items="categoryFilterItems" placeholder="Все категории" size="sm" class="max-w-[200px]" />
    </div>

    <div
      v-if="isPending && !data"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
      Загрузка…
    </div>

    <AppDataCard v-else-if="data?.data.length" flush>
      <div class="divide-y divide-(--ui-border)">
        <div
          v-for="item in data.data"
          :key="item.id"
          class="group flex items-center gap-3 px-4 py-3 hover:bg-(--ui-bg-elevated) transition"
          @mouseenter="prefetchPage(item.id)"
        >
          <UIcon name="i-solar-file-text-linear" class="size-4 text-(--ui-text-dimmed) shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <NuxtLink :to="`/pages/${item.id}`" class="text-sm font-semibold truncate hover:underline">
                {{ item.title }}
              </NuxtLink>
              <AppStatusPill
                :tone="(({ draft: 'warning', published: 'success', archived: 'muted' } as const)[item.status as 'draft' | 'published' | 'archived']) ?? 'muted'"
                :label="pageStatusLabels[item.status] ?? item.status"
                dot
              />
              <AppStatusPill v-if="item.category" tone="neutral" :label="item.category.title" />
            </div>
            <div class="text-[11px] text-(--ui-text-dimmed) tabular-nums mt-0.5">
              создано {{ formatDate(item.createdAt) }}
            </div>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
            <UButton :to="`/pages/${item.id}`" variant="ghost" icon="i-solar-pen-new-square-linear" title="Редактировать" />
            <UButton variant="ghost" icon="i-solar-trash-bin-trash-linear" title="Удалить" :loading="deleteMutation.isPending.value" @click="deleteMutation.mutate(item.id)" />
          </div>
        </div>
      </div>
    </AppDataCard>

    <AppEmptyState
      v-else
      icon="i-solar-file-remove-linear"
      title="Страниц не найдено"
      description="Создайте первую страницу для сайта."
    >
      <template #actions>
        <UButton to="/pages/create" icon="i-solar-add-square-linear" color="primary">
          Создать страницу
        </UButton>
      </template>
    </AppEmptyState>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-4 flex justify-center">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>
    <PageCategoriesModal v-model:open="categoriesModalOpen" />
  </PageContainer>
</template>
