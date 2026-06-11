<script setup lang="ts">
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const page = ref(1);
const pageSize = 20;
const search = ref("");
const debouncedSearch = refDebounced(search, 300);
const statusFilter = ref<NewsStatus>();

const { data, isPending } = useQuery(
  computed(() => ({
    ...$orpc.news.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        search: debouncedSearch.value || undefined,
        status: statusFilter.value,
      },
    }),
    placeholderData: keepPreviousData,
  })),
);

function prefetchNews(id: string) {
  queryClient.prefetchQuery($orpc.news.getById.queryOptions({ input: { id } }));
}

watch([debouncedSearch, statusFilter], () => {
  page.value = 1;
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.news.delete({ id }),
  onMutate: async (id) => {
    const listKey = $orpc.news.list.key();
    await queryClient.cancelQueries({ queryKey: listKey });
    const snapshots = queryClient.getQueriesData({ queryKey: listKey });
    queryClient.setQueriesData({ queryKey: listKey }, (old: any) => {
      if (!old?.data) return old;
      return { ...old, data: old.data.filter((n: any) => n.id !== id), total: Math.max(0, (old.total ?? 0) - 1) };
    });
    return { snapshots };
  },
  onError: (_err, _id, ctx) => {
    if (!ctx) return;
    for (const [key, data] of ctx.snapshots) queryClient.setQueryData(key, data);
  },
  onSuccess: () => {
    toast.add({ title: "Новость удалена", color: "success" });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: $orpc.news.key() });
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Новости"
      :subtitle="data?.total != null ? `${data.total} статей` : undefined"
    >
      <template #actions>
        <UButton to="/news/create" icon="i-solar-add-square-linear" color="primary">
          Новая статья
        </UButton>
      </template>
    </AppPageHeader>

    <div class="mb-4 flex items-center gap-2">
      <UInput
        v-model="search"
        placeholder="Поиск…"
        icon="i-solar-magnifer-linear"
        size="sm"
        class="max-w-xs"
      />
      <USelect
        v-model="statusFilter"
        :items="newsStatusOptions"
        placeholder="Все статусы"
        size="sm"
        class="max-w-[200px]"
      />
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
          @mouseenter="prefetchNews(item.id)"
        >
          <NuxtLink
            :to="`/news/${item.id}`"
            class="w-20 h-14 rounded-lg bg-(--ui-bg-elevated) shrink-0 overflow-hidden border border-(--ui-border) flex items-center justify-center"
          >
            <img
              v-if="item.coverImage"
              :src="item.coverImage"
              :alt="item.title"
              class="h-full w-full object-cover"
            />
            <UIcon
              v-else
              name="i-solar-notebook-bookmark-linear"
              class="size-5 text-(--ui-text-dimmed)"
            />
          </NuxtLink>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <NuxtLink
                :to="`/news/${item.id}`"
                class="text-sm font-semibold truncate hover:underline"
              >
                {{ item.title }}
              </NuxtLink>
              <AppStatusPill
                :tone="(({ draft: 'warning', published: 'success', archived: 'muted' } as const)[item.status as 'draft' | 'published' | 'archived']) ?? 'muted'"
                :label="newsStatusLabels[item.status] ?? item.status"
                dot
              />
            </div>
            <p
              v-if="item.excerpt"
              class="text-xs text-(--ui-text-muted) truncate mt-0.5"
            >
              {{ item.excerpt }}
            </p>
            <div class="flex items-center gap-3 text-[11px] text-(--ui-text-dimmed) tabular-nums mt-0.5">
              <span v-if="item.publishedAt">
                опубл. {{ formatDate(item.publishedAt) }}
              </span>
              <span>· создано {{ formatDate(item.createdAt) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
            <UButton
              :to="`/news/${item.id}`"
              variant="ghost"
              icon="i-solar-pen-new-square-linear"
              title="Редактировать"
            />
            <UButton
              variant="ghost"
              icon="i-solar-trash-bin-trash-linear"
              title="Удалить"
              :loading="deleteMutation.isPending.value"
              @click="deleteMutation.mutate(item.id)"
            />
          </div>
        </div>
      </div>
    </AppDataCard>

    <AppEmptyState
      v-else
      icon="i-solar-notebook-bookmark-linear"
      title="Новостей не найдено"
      description="Создайте первую статью для сайта."
    >
      <template #actions>
        <UButton to="/news/create" icon="i-solar-add-square-linear" color="primary">
          Создать статью
        </UButton>
      </template>
    </AppEmptyState>

    <div
      v-if="(data?.total ?? 0) > pageSize"
      class="mt-4 flex justify-center"
    >
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="pageSize"
      />
    </div>
  </PageContainer>
</template>
