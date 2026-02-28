<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
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
    $orpc.commerce.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        projectId: projectFilter.value || undefined,
      },
    }),
  ),
);

const columns = [
  { accessorKey: "name", header: "Name" },
  { id: "category", header: "Category" },
  { accessorKey: "area", header: "Area m²" },
  { id: "price", header: "Price" },
  { accessorKey: "floorNumber", header: "Floor" },
  { id: "project", header: "Project" },
];

function formatPrice(price: string | number | null) {
  if (!price) return "—";
  return Number(price).toLocaleString("ru-RU");
}
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Commerce</h1>
      <UButton
        icon="i-tabler-filter"
        variant="outline"
        color="neutral"
        @click="filterOpen = true"
      >
        Filters
        <UBadge v-if="activeFiltersCount" :label="String(activeFiltersCount)" size="sm" color="primary" class="ml-1" />
      </UButton>
    </div>

    <!-- Filter Drawer -->
    <USlideover v-model:open="filterOpen" title="Filters" side="right">
      <template #body>
        <div class="flex flex-col gap-5 p-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium">Project</label>
            <USelect
              v-model="projectFilter"
              :items="projectItems"
              placeholder="All Projects"
            />
          </div>

          <div class="flex gap-2 mt-2">
            <UButton block @click="filterOpen = false">Apply</UButton>
            <UButton block variant="outline" color="neutral" @click="clearFilters">Clear</UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <UTable :data="data?.data ?? []" :columns="columns" :loading="isPending">
      <template #category-cell="{ row }">
        <UBadge v-if="row.original.category" variant="subtle" color="neutral">
          {{ row.original.category }}
        </UBadge>
        <span v-else class="text-(--ui-text-muted)">—</span>
      </template>

      <template #price-cell="{ row }">
        {{ formatPrice(row.original.price) }}{{ row.original.price ? ' ₽' : '' }}
      </template>

      <template #project-cell="{ row }">
        <NuxtLink
          v-if="row.original.project"
          :to="`/projects/${row.original.project.id}`"
          class="text-primary hover:underline"
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
