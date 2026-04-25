<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const props = defineProps<{ project: any }>();
const route = useRoute();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const projectId = computed(() => route.params.id as string);

const page = ref(1);
const pageSize = 50;
const YEAR_ALL = "_all";
const BUILDING_ALL = "_all";
const yearFilter = ref(YEAR_ALL);
const buildingFilter = ref(BUILDING_ALL);

watch([yearFilter, buildingFilter], () => {
  page.value = 1;
});

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.constructionProgress.list.queryOptions({
      input: {
        projectId: projectId.value,
        page: page.value,
        pageSize,
        year: yearFilter.value === YEAR_ALL ? undefined : Number(yearFilter.value),
        buildingId: buildingFilter.value === BUILDING_ALL ? undefined : buildingFilter.value,
      },
    }),
  ),
);

const items = computed(() => data.value?.data ?? []);

// Group by year
const groupedByYear = computed(() => {
  const groups: Record<number, typeof items.value> = {};
  for (const item of items.value) {
    const year = new Date(item.date).getFullYear();
    if (!groups[year]) groups[year] = [];
    groups[year]!.push(item);
  }
  return Object.entries(groups)
    .map(([year, entries]) => ({ year: Number(year), entries: entries! }))
    .sort((a, b) => b.year - a.year);
});

// Building options for filter
const buildingOptions = computed(() => {
  const buildings = props.project?.buildings ?? [];
  return [
    { label: "Все дома", value: BUILDING_ALL },
    ...buildings.map((b: any) => ({ label: b.name, value: b.id })),
  ];
});

// Year options
const currentYear = new Date().getFullYear();
const yearOptions = computed(() => {
  const years = [{ label: "Все годы", value: YEAR_ALL }];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push({ label: String(y), value: String(y) });
  }
  return years;
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.constructionProgress.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Запись удалена", color: "success" });
    queryClient.invalidateQueries({
      queryKey: $orpc.constructionProgress.key(),
    });
  },
});
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <USelect
          v-model="yearFilter"
          :items="yearOptions"
          class="w-32"
        />
        <USelect
          v-if="buildingOptions.length > 1"
          v-model="buildingFilter"
          :items="buildingOptions"
          class="w-48"
        />
      </div>
      <NuxtLink :to="`/projects/${projectId}/progress/create`">
        <UButton icon="i-tabler-plus" class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted)">
          Добавить запись
        </UButton>
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="isPending" class="flex justify-center py-12">
      <UIcon name="i-tabler-loader-2" class="animate-spin text-2xl" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <UIcon name="i-tabler-crane" class="text-4xl text-(--ui-text-dimmed) mb-3" />
      <p class="text-(--ui-text-muted) mb-1">Записей пока нет</p>
      <p class="text-sm text-(--ui-text-dimmed)">
        Добавьте первую запись о ходе строительства
      </p>
    </div>

    <!-- Grouped list -->
    <div v-else class="space-y-6">
      <div v-for="group in groupedByYear" :key="group.year">
        <h3 class="text-lg font-semibold text-(--ui-text-highlighted) mb-3">
          {{ group.year }}
        </h3>
        <div class="space-y-2">
          <NuxtLink
            v-for="item in group.entries"
            :key="item.id"
            :to="`/projects/${projectId}/progress/${item.id}`"
            class="flex items-center gap-4 rounded-lg border border-(--ui-border) p-4 hover:bg-(--ui-bg-elevated) transition-colors"
          >
            <!-- Thumbnail -->
            <div class="h-16 w-24 flex-shrink-0 overflow-hidden rounded-md bg-(--ui-bg-muted)">
              <img
                v-if="item.gallery?.[0]"
                :src="item.gallery[0]"
                class="h-full w-full object-cover"
              />
              <div v-else class="flex h-full items-center justify-center">
                <UIcon name="i-tabler-photo" class="text-xl text-(--ui-text-dimmed)" />
              </div>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-(--ui-text-highlighted) truncate">
                  {{ item.title }}
                </span>
                <UBadge
                  :color="constructionProgressStatusColors[item.status as ConstructionProgressStatus]"
                  variant="subtle"
                  size="xs"
                >
                  {{ constructionProgressStatusLabels[item.status as ConstructionProgressStatus] }}
                </UBadge>
              </div>
              <div class="text-sm text-(--ui-text-muted) mt-0.5">
                {{ formatProgressDate(item.date) }}
                <span v-if="item.building" class="ml-2">
                  · {{ item.building.name }}
                </span>
              </div>
            </div>

            <!-- Actions -->
            <UButton
              variant="ghost"
              icon="i-tabler-trash"
              size="sm"
              color="error"
              :loading="deleteMutation.isPending.value"
              @click.prevent="deleteMutation.mutate(item.id)"
            />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
