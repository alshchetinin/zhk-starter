<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const router = useRouter();
const queryClient = useQueryClient();
const page = ref(1);
const pageSize = 20;

const projectFilter = ref("");
const filterOpen = ref(false);

const { data: projectsData } = useQuery(
  $orpc.projects.list.queryOptions({ input: { page: 1, pageSize: 100 } }),
);

const projectItems = computed(() =>
  projectsData.value?.data.map((p) => ({ label: p.name, value: p.id })) ?? [],
);

const activeFiltersCount = computed(() => (projectFilter.value ? 1 : 0));

watch(projectFilter, () => {
  page.value = 1;
});

function clearFilters() {
  projectFilter.value = "";
}

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.storage.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        projectId: projectFilter.value || undefined,
      },
    }),
  ),
);

const columns = [
  { accessorKey: "name", header: "Номер" },
  { accessorKey: "area", header: "Площадь, м²" },
  { id: "price", header: "Цена" },
  { accessorKey: "floorNumber", header: "Этаж" },
  { id: "project", header: "Проект" },
];

function formatPrice(price: string | number | null) {
  if (!price) return "—";
  return Number(price).toLocaleString("ru-RU");
}

function prefetch(id: string) {
  queryClient.prefetchQuery(
    $orpc.storage.getById.queryOptions({ input: { id } }),
  );
}
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Кладовки</h1>
      <UButton
        icon="i-tabler-filter"
        variant="outline"
        color="neutral"
        @click="filterOpen = true"
      >
        Фильтры
        <UBadge v-if="activeFiltersCount" :label="String(activeFiltersCount)" size="sm" color="primary" class="ml-1" />
      </UButton>
    </div>

    <USlideover v-model:open="filterOpen" title="Фильтры" side="right">
      <template #body>
        <div class="flex flex-col gap-5 p-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium">Проект</label>
            <USelect
              v-model="projectFilter"
              :items="projectItems"
              placeholder="Все проекты"
            />
          </div>
          <div class="flex gap-2 mt-2">
            <UButton block @click="filterOpen = false">Применить</UButton>
            <UButton block variant="outline" color="neutral" @click="clearFilters">Сбросить</UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <UTable
      :data="data?.data ?? []"
      :columns="columns"
      :loading="isPending"
      :ui="{ tr: 'cursor-pointer hover:bg-(--ui-bg-elevated)' }"
      @select="(row: any) => router.push(`/storage/${row.original.id}`)"
    >
      <template #name-cell="{ row }">
        <span class="font-medium" @mouseenter="prefetch(row.original.id)">
          {{ row.original.name ?? '—' }}
        </span>
      </template>

      <template #price-cell="{ row }">
        {{ formatPrice(row.original.price) }}{{ row.original.price ? ' ₽' : '' }}
      </template>

      <template #project-cell="{ row }">
        <NuxtLink
          v-if="row.original.project"
          :to="`/projects/${row.original.project.id}`"
          class="text-primary hover:underline"
          @click.stop
        >
          {{ row.original.project.name }}
        </NuxtLink>
        <span v-else class="text-(--ui-text-muted)">—</span>
      </template>
    </UTable>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-6 flex justify-center">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>
  </PageContainer>
</template>
