<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const page = ref(1);
const pageSize = 20;

// Filters
const projectFilter = ref("");
const statusFilter = ref("");
const roomsFilter = ref("");
const filterOpen = ref(false);

const { data: projectsData } = useQuery(
  $orpc.projects.list.queryOptions({ input: { page: 1, pageSize: 100 } }),
);

const projectItems = computed(() =>
  projectsData.value?.data.map((p) => ({ label: p.name, value: p.id })) ?? [],
);

const statusItems = [
  { label: "Free", value: "free" },
  { label: "Paid Reservation", value: "paid_reservation" },
  { label: "Corporate Reservation", value: "corporate_reservation" },
  { label: "Sold", value: "sold" },
];

const roomsItems = [
  { label: "Studio", value: "0" },
  { label: "1 room", value: "1" },
  { label: "2 rooms", value: "2" },
  { label: "3 rooms", value: "3" },
  { label: "4+ rooms", value: "4" },
];

const activeFiltersCount = computed(() => {
  let count = 0;
  if (projectFilter.value) count++;
  if (statusFilter.value) count++;
  if (roomsFilter.value) count++;
  return count;
});

watch([projectFilter, statusFilter, roomsFilter], () => {
  page.value = 1;
});

function clearFilters() {
  projectFilter.value = "";
  statusFilter.value = "";
  roomsFilter.value = "";
}

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.apartments.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        projectId: projectFilter.value || undefined,
        status: (statusFilter.value || undefined) as any,
        roomsCount: roomsFilter.value ? Number(roomsFilter.value) : undefined,
      },
    }),
  ),
);

const columns = [
  { accessorKey: "apartmentNumber", header: "#" },
  { accessorKey: "roomsCount", header: "Rooms" },
  { accessorKey: "area", header: "Area m²" },
  { id: "price", header: "Price" },
  { accessorKey: "floorNumber", header: "Floor" },
  { id: "status", header: "Status" },
  { id: "project", header: "Project" },
  { id: "actions", header: "" },
];

const statusColors: Record<string, "success" | "warning" | "error" | "neutral"> = {
  free: "success",
  paid_reservation: "warning",
  corporate_reservation: "warning",
  sold: "error",
};

function formatPrice(price: string | number) {
  return Number(price).toLocaleString("ru-RU");
}
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Apartments</h1>
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
          <div>
            <label class="mb-1.5 block text-sm font-medium">Status</label>
            <USelect
              v-model="statusFilter"
              :items="statusItems"
              placeholder="All Statuses"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium">Rooms</label>
            <USelect
              v-model="roomsFilter"
              :items="roomsItems"
              placeholder="All Rooms"
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
      <template #price-cell="{ row }">
        {{ formatPrice(row.original.price) }} ₽
      </template>

      <template #status-cell="{ row }">
        <UBadge :color="statusColors[row.original.status] ?? 'neutral'" variant="subtle">
          {{ row.original.status.replace(/_/g, " ") }}
        </UBadge>
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

      <template #actions-cell="{ row }">
        <UButton
          :to="`/apartments/${row.original.id}`"
          variant="ghost"
          icon="i-tabler-eye"
          size="sm"
        />
      </template>
    </UTable>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-6 flex justify-center">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>
  </PageContainer>
</template>
