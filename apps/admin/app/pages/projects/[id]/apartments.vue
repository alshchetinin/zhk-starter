<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const props = defineProps<{
  project: any;
}>();

const { $orpc } = useNuxtApp();
const route = useRoute();
const projectId = computed(() => route.params.id as string);

const page = ref(1);
const pageSize = 20;

// Filters
const statusFilter = ref("");
const roomsFilter = ref("");
const buildingFilter = ref("");
const filterOpen = ref(false);

const buildingItems = computed(() =>
  props.project?.buildings?.map((b: any) => ({ label: b.name, value: b.id })) ?? [],
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
  if (statusFilter.value) count++;
  if (roomsFilter.value) count++;
  if (buildingFilter.value) count++;
  return count;
});

watch([statusFilter, roomsFilter, buildingFilter], () => {
  page.value = 1;
});

function clearFilters() {
  statusFilter.value = "";
  roomsFilter.value = "";
  buildingFilter.value = "";
}

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.apartments.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        projectId: projectId.value,
        buildingId: buildingFilter.value || undefined,
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
  { id: "building", header: "Building" },
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
  <div>
    <div class="mb-4 flex items-center justify-end">
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
            <label class="mb-1.5 block text-sm font-medium">Building</label>
            <USelect
              v-model="buildingFilter"
              :items="buildingItems"
              placeholder="All Buildings"
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

      <template #building-cell="{ row }">
        <NuxtLink
          v-if="row.original.building"
          :to="`/buildings/${row.original.building.id}`"
          class="text-primary hover:underline"
        >
          {{ row.original.building.name }}
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
  </div>
</template>
