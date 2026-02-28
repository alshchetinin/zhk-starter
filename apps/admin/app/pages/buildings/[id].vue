<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const route = useRoute();
const id = computed(() => route.params.id as string);

const { data: building, isPending } = useQuery(
  computed(() => $orpc.buildings.getById.queryOptions({ input: { id: id.value } })),
);

// Fetch all apartments for this building (dedicated endpoint, no pagination)
const { data: allApartments } = useQuery(
  computed(() =>
    $orpc.apartments.listByBuilding.queryOptions({
      input: { buildingId: id.value },
    }),
  ),
);

// Group apartments by sectionId → floorNumber (descending) → sorted by apartmentNumber
const checkerboardData = computed(() => {
  if (!building.value?.sections || !allApartments.value) return [];

  const aptsBySection = new Map<string, typeof allApartments.value>();
  for (const apt of allApartments.value) {
    const sectionId = apt.sectionId ?? "__none__";
    if (!aptsBySection.has(sectionId)) aptsBySection.set(sectionId, []);
    aptsBySection.get(sectionId)!.push(apt);
  }

  return building.value.sections.map((section) => {
    const sectionApts = aptsBySection.get(section.id) ?? [];

    // Group by floor
    const floorMap = new Map<number, typeof sectionApts>();
    for (const apt of sectionApts) {
      const floor = apt.floorNumber ?? 0;
      if (!floorMap.has(floor)) floorMap.set(floor, []);
      floorMap.get(floor)!.push(apt);
    }

    // Sort floors descending, apartments ascending by number
    const floors = [...floorMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([floorNumber, apts]) => ({
        floorNumber,
        apartments: apts.sort((a, b) =>
          parseInt(a.apartmentNumber) - parseInt(b.apartmentNumber),
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
  <PageContainer>
    <!-- Breadcrumb -->
    <UBreadcrumb
      :items="[
        { label: 'Buildings', to: '/buildings', icon: 'i-tabler-building-skyscraper' },
        { label: building?.name ?? '...' },
      ]"
      class="mb-6"
    />

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Loading...</span>
    </div>

    <template v-else-if="building">
      <!-- Header -->
      <div class="mb-6 flex items-center gap-3">
        <h1 class="text-2xl font-bold">{{ building.name }}</h1>
      </div>

      <!-- Info -->
      <div class="mb-8 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="flex items-start gap-3">
            <UIcon name="i-tabler-building" class="mt-0.5 size-4 text-(--ui-text-muted)" />
            <div>
              <p class="text-xs text-(--ui-text-muted)">Project</p>
              <NuxtLink
                v-if="building.project"
                :to="`/projects/${building.project.id}`"
                class="text-sm font-medium text-primary hover:underline"
              >
                {{ building.project.name }}
              </NuxtLink>
              <p v-else class="text-sm font-medium">—</p>
            </div>
          </div>
          <div v-if="building.completionDate" class="flex items-start gap-3">
            <UIcon name="i-tabler-calendar" class="mt-0.5 size-4 text-(--ui-text-muted)" />
            <div>
              <p class="text-xs text-(--ui-text-muted)">Completion Date</p>
              <p class="text-sm font-medium">{{ building.completionDate }}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <UIcon name="i-tabler-layers-intersect" class="mt-0.5 size-4 text-(--ui-text-muted)" />
            <div>
              <p class="text-xs text-(--ui-text-muted)">Sections</p>
              <p class="text-sm font-medium">{{ building.sections?.length ?? 0 }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Apartment Stats -->
      <div class="mb-8">
        <h2 class="mb-4 text-lg font-semibold">Apartments</h2>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-home" class="size-4 text-blue-500" />
              <span class="text-xs text-(--ui-text-muted)">Total</span>
            </div>
            <p class="mt-1 text-xl font-bold">{{ building.totalApartmentsCount ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-circle-check" class="size-4 text-green-500" />
              <span class="text-xs text-(--ui-text-muted)">Free</span>
            </div>
            <p class="mt-1 text-xl font-bold text-green-600">{{ building.freeApartmentsCount ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-circle-x" class="size-4 text-red-500" />
              <span class="text-xs text-(--ui-text-muted)">Sold</span>
            </div>
            <p class="mt-1 text-xl font-bold">{{ building.soldApartmentsCount ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-clock" class="size-4 text-yellow-500" />
              <span class="text-xs text-(--ui-text-muted)">Reserved</span>
            </div>
            <p class="mt-1 text-xl font-bold">{{ building.paidReservationCount ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-briefcase" class="size-4 text-purple-500" />
              <span class="text-xs text-(--ui-text-muted)">Corporate</span>
            </div>
            <p class="mt-1 text-xl font-bold">{{ building.corporateReservationCount ?? 0 }}</p>
          </div>
        </div>
      </div>

      <!-- Checkerboard / Шахматка -->
      <div v-if="hasApartments" class="mb-8">
        <h2 class="mb-4 text-lg font-semibold">Checkerboard</h2>

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
                <!-- Floor number -->
                <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-(--ui-bg-elevated) text-xs font-medium text-(--ui-text-muted)">
                  {{ floor.floorNumber }}
                </div>

                <!-- Apartments -->
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
      </div>

      <!-- Sections (only show if no apartments to show checkerboard) -->
      <div v-else-if="building.sections?.length">
        <h2 class="mb-4 text-lg font-semibold">Sections ({{ building.sections.length }})</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="section in building.sections"
            :key="section.id"
            class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-layers-intersect" class="size-4 text-(--ui-text-muted)" />
              <span class="font-medium">{{ section.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
