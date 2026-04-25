<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const page = ref(1);
const pageSize = 20;
const search = ref("");
const debouncedSearch = refDebounced(search, 300);
const statusFilter = ref<DocumentStatus>();

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.documents.list.queryOptions({
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
  mutationFn: (id: string) => $orpcClient.documents.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Документ удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.documents.key() });
  },
});
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Документы</h1>
      <div class="flex items-center gap-3">
        <UInput
          v-model="search"
          placeholder="Поиск..."
          icon="i-tabler-search"
          class="w-48"
        />
        <USelect
          v-model="statusFilter"
          :items="documentStatusOptions"
          placeholder="Все статусы"
          class="w-40"
        />
        <NuxtLink to="/documents/create">
          <UButton
            icon="i-tabler-plus"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) transition-colors"
          >
            Новый документ
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <div
      v-if="isPending"
      class="flex items-center gap-2 text-(--ui-text-muted)"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <div v-else-if="data?.data.length" class="grid grid-cols-1 gap-4">
      <div
        v-for="item in data.data"
        :key="item.id"
        class="flex gap-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 transition-shadow hover:shadow-md"
      >
        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <NuxtLink
              :to="`/documents/${item.id}`"
              class="text-base font-semibold truncate hover:underline"
            >
              {{ item.title }}
            </NuxtLink>
            <UBadge
              :color="documentStatusColors[item.status] ?? 'neutral'"
              variant="subtle"
            >
              {{ documentStatusLabels[item.status] ?? item.status }}
            </UBadge>
          </div>
          <div class="flex items-center gap-4 text-xs text-(--ui-text-dimmed)">
            <span>#{{ item.sortOrder }}</span>
            <span>Создано: {{ formatDate(item.createdAt) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 shrink-0">
          <NuxtLink :to="`/documents/${item.id}`">
            <UButton
              variant="ghost"
              size="xs"
              icon="i-tabler-edit"
              class="rounded-lg"
            />
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
      <UIcon
        name="i-tabler-file-off"
        class="mx-auto size-12 text-(--ui-text-muted)"
      />
      <p class="mt-2 text-(--ui-text-muted)">Документы не найдены</p>
      <NuxtLink to="/documents/create">
        <UButton class="mt-4" icon="i-tabler-plus">
          Создать первый документ
        </UButton>
      </NuxtLink>
    </div>

    <div
      v-if="(data?.total ?? 0) > pageSize"
      class="mt-6 flex justify-center"
    >
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="pageSize"
      />
    </div>
  </PageContainer>
</template>
