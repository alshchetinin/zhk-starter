<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const page = ref(1);
const pageSize = 20;
const search = ref("");
const debouncedSearch = refDebounced(search, 300);
const statusFilter = ref<PromotionStatus>();

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.promotions.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        search: debouncedSearch.value || undefined,
        status: statusFilter.value,
      },
    }),
  ),
);

watch([debouncedSearch, statusFilter], () => {
  page.value = 1;
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.promotions.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Акция удалена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.promotions.key() });
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Акции"
      :subtitle="data?.total != null ? `${data.total} акций` : undefined"
    >
      <template #actions>
        <UButton
          to="/promotions/create"
          icon="i-solar-add-square-linear"
          color="primary"
        >
          Новая акция
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
        :items="promotionStatusOptions"
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
        >
          <NuxtLink
            :to="`/promotions/${item.id}`"
            class="flex items-center justify-center w-16 h-12 rounded-lg bg-(--ui-bg-elevated) shrink-0 overflow-hidden border border-(--ui-border)"
          >
            <img
              v-if="item.coverImage"
              :src="item.coverImage"
              :alt="item.name"
              class="h-full w-full object-cover"
            />
            <UIcon
              v-else
              name="i-solar-tag-linear"
              class="size-5 text-(--ui-text-dimmed)"
            />
          </NuxtLink>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <NuxtLink
                :to="`/promotions/${item.id}`"
                class="text-sm font-semibold truncate hover:underline"
              >
                {{ item.name }}
              </NuxtLink>
              <AppStatusPill
                :tone="(({ draft: 'warning', published: 'success', archived: 'muted' } as const)[item.status as 'draft' | 'published' | 'archived']) ?? 'muted'"
                :label="promotionStatusLabels[item.status] ?? item.status"
                dot
              />
            </div>
            <p
              v-if="item.dateStart || item.dateEnd"
              class="text-xs text-(--ui-text-muted) truncate mt-0.5 tabular-nums"
            >
              {{ formatDate(item.dateStart) }} — {{ formatDate(item.dateEnd) }}
            </p>
          </div>

          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
            <UButton
              :to="`/promotions/${item.id}`"
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
      icon="i-solar-tag-linear"
      title="Акций не найдено"
      description="Создайте первую акцию для привлечения клиентов."
    >
      <template #actions>
        <UButton
          to="/promotions/create"
          icon="i-solar-add-square-linear"
          color="primary"
        >
          Создать акцию
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
