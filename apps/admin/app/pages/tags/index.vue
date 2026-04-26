<script setup lang="ts">
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const page = ref(1);
const pageSize = 20;
const search = ref("");
const debouncedSearch = refDebounced(search, 300);

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.tags.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        search: debouncedSearch.value || undefined,
      },
      placeholderData: keepPreviousData,
    }),
  ),
);

watch(debouncedSearch, () => {
  page.value = 1;
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.tags.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Тег удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.tags.key() });
  },
  onError: (err: Error) => {
    toast.add({ title: "Не удалось удалить", description: err.message, color: "error" });
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Теги"
      :subtitle="data?.total != null ? `${data.total} тегов` : undefined"
    >
      <template #actions>
        <UButton to="/tags/create" icon="i-tabler-plus" color="primary">
          Новый тег
        </UButton>
      </template>
    </AppPageHeader>

    <div class="mb-4">
      <UInput
        v-model="search"
        placeholder="Поиск по названию…"
        icon="i-tabler-search"
        size="sm"
        class="max-w-xs"
      />
    </div>

    <div
      v-if="isPending && !data"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <AppDataCard v-else-if="data?.data.length" flush>
      <div class="divide-y divide-(--ui-border)">
        <div
          v-for="tag in data.data"
          :key="tag.id"
          class="group flex items-center gap-3 px-4 py-3 hover:bg-(--ui-bg-elevated) transition"
        >
          <div
            class="size-10 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0 overflow-hidden"
          >
            <img
              v-if="tag.imageUrl"
              :src="tag.imageUrl"
              :alt="tag.name"
              class="size-full object-cover"
            />
            <UIcon v-else name="i-tabler-tag" class="size-5 text-(--ui-text-dimmed)" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <NuxtLink
                :to="`/tags/${tag.id}`"
                class="text-sm font-semibold truncate hover:underline"
              >
                {{ tag.name }}
              </NuxtLink>
              <AppStatusPill v-if="tag.integrationId" tone="warning" label="Импорт" />
            </div>
            <p
              v-if="tag.description"
              class="text-xs text-(--ui-text-muted) line-clamp-1 mt-0.5"
            >
              {{ tag.description }}
            </p>
          </div>

          <div
            class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition"
          >
            <UButton
              :to="`/tags/${tag.id}`"
              variant="ghost"
              icon="i-tabler-edit"
              title="Редактировать"
            />
            <UButton
              v-if="!tag.integrationId"
              variant="ghost"
              icon="i-tabler-trash"
              title="Удалить"
              :loading="deleteMutation.isPending.value"
              @click="deleteMutation.mutate(tag.id)"
            />
          </div>
        </div>
      </div>
    </AppDataCard>

    <AppEmptyState
      v-else
      icon="i-tabler-tag"
      title="Тегов пока нет"
      description="Создайте теги, чтобы группировать планировки и квартиры."
    >
      <template #actions>
        <UButton to="/tags/create" icon="i-tabler-plus" color="primary">
          Создать тег
        </UButton>
      </template>
    </AppEmptyState>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-4 flex justify-center">
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="pageSize"
      />
    </div>
  </PageContainer>
</template>
