<script setup lang="ts">
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const page = ref(1);
const pageSize = 20;
const search = ref("");
const debouncedSearch = refDebounced(search, 300);
const statusFilter = ref<ModalStatus>();

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.modals.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        search: debouncedSearch.value || undefined,
        status: statusFilter.value,
      },
      placeholderData: keepPreviousData,
    }),
  ),
);

watch([debouncedSearch, statusFilter], () => {
  page.value = 1;
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.modals.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Модальное окно удалено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.modals.key() });
  },
  onError: (error) => {
    toast.add({ title: "Ошибка удаления", description: error.message, color: "error" });
  },
});
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Модальные окна</h1>
      <div class="flex items-center gap-3">
        <UInput
          v-model="search"
          placeholder="Поиск..."
          icon="i-tabler-search"
          class="w-48"
        />
        <USelect
          v-model="statusFilter"
          :items="modalStatusOptions"
          placeholder="Все статусы"
          class="w-40"
        />
        <NuxtLink to="/modals/create">
          <UButton
            icon="i-tabler-plus"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) transition-colors"
          >
            Новое окно
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <div v-else-if="data?.data.length" class="grid grid-cols-1 gap-4">
      <div
        v-for="item in data.data"
        :key="item.id"
        class="flex items-center gap-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 transition-shadow hover:shadow-md"
      >
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-(--ui-bg-elevated) shrink-0">
          <UIcon name="i-tabler-app-window" class="size-5 text-(--ui-text-muted)" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <NuxtLink
              :to="`/modals/${item.id}`"
              class="text-base font-semibold truncate hover:underline"
            >
              {{ item.title }}
            </NuxtLink>
            <UBadge
              :color="modalStatusColors[item.status] ?? 'neutral'"
              variant="subtle"
            >
              {{ modalStatusLabels[item.status] ?? item.status }}
            </UBadge>
          </div>
          <div class="flex items-center gap-4 text-xs text-(--ui-text-dimmed)">
            <span class="font-mono">modal:{{ item.slug }}</span>
            <span>Создано: {{ formatDate(item.createdAt) }}</span>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <NuxtLink :to="`/modals/${item.id}`">
            <UButton variant="ghost" size="xs" icon="i-tabler-edit" class="rounded-lg" />
          </NuxtLink>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-tabler-trash"
            color="error"
            class="rounded-lg"
            :loading="deleteMutation.isPending.value"
            @click="deleteMutation.mutate(item.id)"
          />
        </div>
      </div>
    </div>

    <div
      v-else
      class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-12 text-center"
    >
      <UIcon name="i-tabler-app-window" class="mx-auto size-12 text-(--ui-text-muted)" />
      <p class="mt-2 text-(--ui-text-muted)">Модальные окна не найдены</p>
      <NuxtLink to="/modals/create">
        <UButton class="mt-4" icon="i-tabler-plus">Создать первое окно</UButton>
      </NuxtLink>
    </div>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-6 flex justify-center">
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="pageSize"
      />
    </div>
  </PageContainer>
</template>
