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
    <AppEmptyState
      v-if="!buildings.length"
      icon="i-tabler-building-skyscraper"
      title="В проекте нет домов"
      description="Сначала добавьте дом, затем создайте секции и квартиры."
    />

    <template v-else>
      <nav class="flex gap-0.5 mb-4 border-b border-(--ui-border) overflow-x-auto">
        <button
          v-for="building in buildings"
          :key="building.id"
          class="px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap cursor-pointer"
          :class="
            selectedBuildingId === building.id
              ? 'border-(--ui-text) text-(--ui-text)'
              : 'border-transparent text-(--ui-text-muted) hover:text-(--ui-text)'
          "
          @click="selectedBuildingId = building.id"
        >
          {{ building.name }}
        </button>
      </nav>

      <div
        v-if="isLoadingApartments"
        class="flex items-center gap-2 py-8 text-xs text-(--ui-text-dimmed) justify-center"
      >
        <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
        Загрузка…
      </div>

      <AppDataCard v-else-if="hasApartments" flush title="Шахматка">
        <template #actions>
          <div class="flex items-center gap-3 text-[11px]">
            <span class="flex items-center gap-1.5">
              <span class="size-2 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
              <span class="text-(--ui-text-dimmed)">Свободно</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="size-2 rounded-sm bg-amber-500/30 border border-amber-500/50" />
              <span class="text-(--ui-text-dimmed)">Бронь</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="size-2 rounded-sm bg-violet-500/30 border border-violet-500/50" />
              <span class="text-(--ui-text-dimmed)">Корп.</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="size-2 rounded-sm bg-zinc-500/30 border border-zinc-500/50" />
              <span class="text-(--ui-text-dimmed)">Продано</span>
            </span>
          </div>
        </template>
        <div class="flex items-end gap-3 overflow-x-auto p-4">
          <div
            v-for="{ section, floors } in checkerboardData"
            :key="section.id"
            class="shrink-0 rounded-lg border border-(--ui-border) bg-(--ui-bg)"
          >
            <div class="border-b border-(--ui-border) px-3 py-2">
              <h3 class="text-xs font-semibold tracking-tight">{{ section.name }}</h3>
            </div>
            <div class="space-y-1 p-2">
              <div
                v-for="floor in floors"
                :key="floor.floorNumber"
                class="flex items-center gap-2 rounded-md p-1 hover:bg-(--ui-bg-elevated) transition"
              >
                <div
                  class="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--ui-bg-elevated) text-[11px] font-medium text-(--ui-text-muted) tabular-nums"
                >
                  {{ floor.floorNumber }}
                </div>
                <div class="flex flex-wrap gap-1">
                  <CheckerboardCell
                    v-for="apt in floor.apartments"
                    :key="apt.id"
                    :apartment="apt"
                  />
                </div>
              </div>
              <div
                v-if="!floors.length"
                class="px-3 py-4 text-center text-xs text-(--ui-text-dimmed)"
              >
                Квартир нет
              </div>
            </div>
          </div>
        </div>
      </AppDataCard>

      <AppEmptyState
        v-else
        icon="i-tabler-home-off"
        title="В этом доме нет квартир"
        description="Добавьте секции и квартиры для отображения шахматки."
      />
    </template>
  </div>
</template>
