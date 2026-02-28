<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const props = defineProps<{
  project: any;
}>();

const { $orpc } = useNuxtApp();

const buildings = computed(() => props.project?.buildings ?? []);
const selectedBuildingId = ref<string>("");

// Auto-select first building
watch(
  buildings,
  (val) => {
    if (val.length && !selectedBuildingId.value) {
      selectedBuildingId.value = val[0].id;
    }
  },
  { immediate: true },
);

const selectedBuilding = computed(() =>
  buildings.value.find((b: any) => b.id === selectedBuildingId.value),
);

// Fetch building detail (with sections) for selected building
const { data: buildingDetail } = useQuery(
  computed(() =>
    $orpc.buildings.getById.queryOptions({
      input: { id: selectedBuildingId.value },
      enabled: !!selectedBuildingId.value,
    }),
  ),
);

// Fetch apartments for selected building
const { data: allApartments, isPending: isLoadingApartments } = useQuery(
  computed(() =>
    $orpc.apartments.listByBuilding.queryOptions({
      input: { buildingId: selectedBuildingId.value },
      enabled: !!selectedBuildingId.value,
    }),
  ),
);

// Group apartments by section → floor (descending) → sorted by number
const checkerboardData = computed(() => {
  const sections = buildingDetail.value?.sections;
  if (!sections || !allApartments.value) return [];

  const aptsBySection = new Map<string, typeof allApartments.value>();
  for (const apt of allApartments.value) {
    const sectionId = apt.sectionId ?? "__none__";
    if (!aptsBySection.has(sectionId)) aptsBySection.set(sectionId, []);
    aptsBySection.get(sectionId)!.push(apt);
  }

  return sections.map((section: any) => {
    const sectionApts = aptsBySection.get(section.id) ?? [];

    const floorMap = new Map<number, typeof sectionApts>();
    for (const apt of sectionApts) {
      const floor = apt.floorNumber ?? 0;
      if (!floorMap.has(floor)) floorMap.set(floor, []);
      floorMap.get(floor)!.push(apt);
    }

    const floors = [...floorMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([floorNumber, apts]) => ({
        floorNumber,
        apartments: apts.sort(
          (a, b) => parseInt(a.apartmentNumber) - parseInt(b.apartmentNumber),
        ),
      }));

    return { section, floors, totalApts: sectionApts.length };
  });
});

const hasApartments = computed(() =>
  checkerboardData.value.some((s) => s.totalApts > 0),
);
</script>

<template>
  <div>
    <!-- No buildings -->
    <div v-if="!buildings.length" class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-12 text-center">
      <UIcon name="i-tabler-building-skyscraper" class="mx-auto size-12 text-(--ui-text-muted)" />
      <p class="mt-2 text-(--ui-text-muted)">No buildings in this project</p>
    </div>

    <template v-else>
      <!-- Building selector tabs -->
      <div class="flex gap-1 mb-4 border-b border-(--ui-border) overflow-x-auto">
        <button
          v-for="building in buildings"
          :key="building.id"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer"
          :class="
            selectedBuildingId === building.id
              ? 'border-(--ui-primary) text-(--ui-primary)'
              : 'border-transparent text-(--ui-text-muted) hover:text-(--ui-text)'
          "
          @click="selectedBuildingId = building.id"
        >
          {{ building.name }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoadingApartments" class="flex items-center gap-2 py-8 text-(--ui-text-muted)">
        <UIcon name="i-tabler-loader-2" class="animate-spin" />
        <span>Loading apartments...</span>
      </div>

      <!-- Checkerboard -->
      <template v-else-if="hasApartments">
        <!-- Status Legend -->
        <div class="mb-4 flex flex-wrap gap-3">
          <div class="flex items-center gap-1.5 text-xs">
            <span class="size-3 rounded bg-green-100 border border-green-200 dark:bg-green-950 dark:border-green-800" />
            <span class="text-(--ui-text-muted)">Free</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="size-3 rounded bg-blue-100 border border-blue-200 dark:bg-blue-950 dark:border-blue-800" />
            <span class="text-(--ui-text-muted)">Reserved</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="size-3 rounded bg-yellow-100 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800" />
            <span class="text-(--ui-text-muted)">Corporate</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="size-3 rounded bg-red-100 border border-red-200 dark:bg-red-950 dark:border-red-800" />
            <span class="text-(--ui-text-muted)">Sold</span>
          </div>
        </div>

        <!-- Sections displayed horizontally -->
        <div class="flex items-end gap-4 overflow-x-auto pb-2">
          <div
            v-for="{ section, floors } in checkerboardData"
            :key="section.id"
            class="shrink-0 rounded-xl border border-(--ui-border) bg-(--ui-bg) shadow-sm"
          >
            <!-- Section header -->
            <div class="border-b border-(--ui-border) px-4 py-3">
              <h3 class="text-sm font-semibold">{{ section.name }}</h3>
            </div>

            <!-- Floors -->
            <div class="space-y-1 p-2">
              <div
                v-for="floor in floors"
                :key="floor.floorNumber"
                class="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-(--ui-bg-elevated)"
              >
                <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-(--ui-bg-elevated) text-xs font-medium text-(--ui-text-muted)">
                  {{ floor.floorNumber }}
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <CheckerboardCell
                    v-for="apt in floor.apartments"
                    :key="apt.id"
                    :apartment="apt"
                  />
                </div>
              </div>

              <div v-if="!floors.length" class="px-4 py-6 text-center text-sm text-(--ui-text-muted)">
                No apartments
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- No apartments for this building -->
      <div v-else class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-8 text-center">
        <p class="text-(--ui-text-muted)">No apartments in this building</p>
      </div>
    </template>
  </div>
</template>
