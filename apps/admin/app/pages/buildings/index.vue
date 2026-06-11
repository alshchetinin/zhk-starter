<script setup lang="ts">
import { keepPreviousData, useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const page = ref(1);
const pageSize = 20;
const projectFilter = ref("");

const { data: projectsData } = useQuery(
  $orpc.projects.list.queryOptions({ input: { page: 1, pageSize: 100 } }),
);

const projectItems = computed(() =>
  projectsData.value?.data.map((p) => ({ label: p.name, value: p.id })) ?? [],
);

watch(projectFilter, () => {
  page.value = 1;
});

const { data, isPending } = useQuery(
  computed(() => ({
    ...$orpc.buildings.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        projectId: projectFilter.value || undefined,
      },
    }),
    placeholderData: keepPreviousData,
  })),
);

function soldPct(b: {
  soldApartmentsCount?: number | null;
  totalApartmentsCount?: number | null;
}) {
  const total = b.totalApartmentsCount ?? 0;
  if (!total) return 0;
  return Math.round(((b.soldApartmentsCount ?? 0) / total) * 100);
}
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Дома"
      :subtitle="data?.total != null ? `${data.total} зданий` : undefined"
    />

    <div class="mb-4 flex items-center gap-2">
      <USelect
        v-model="projectFilter"
        :items="projectItems"
        placeholder="Все ЖК"
        size="sm"
        class="max-w-xs"
      />
      <UButton
        v-if="projectFilter"
        variant="ghost"
        icon="i-solar-close-circle-linear"
        title="Сбросить фильтр"
        @click="projectFilter = ''"
      />
    </div>

    <AppDataCard v-if="isPending && !data" flush>
      <div
        class="p-12 text-center text-xs text-(--ui-text-dimmed) flex items-center justify-center gap-2"
      >
        <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
        Загрузка…
      </div>
    </AppDataCard>

    <AppDataCard v-else-if="data?.data.length" flush>
      <div class="divide-y divide-(--ui-border)">
        <NuxtLink
          v-for="building in data.data"
          :key="building.id"
          :to="`/buildings/${building.id}`"
          class="group flex items-center gap-4 px-4 py-3 hover:bg-(--ui-bg-elevated) transition"
        >
          <div
            class="size-10 rounded-lg bg-(--ui-bg-elevated) flex items-center justify-center shrink-0 border border-(--ui-border)"
          >
            <UIcon
              name="i-solar-buildings-2-linear"
              class="size-5 text-(--ui-text-dimmed)"
            />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold truncate">
                {{ building.name }}
              </span>
              <span
                v-if="building.project"
                class="text-[11px] text-(--ui-text-dimmed) truncate"
              >
                · {{ building.project.name }}
              </span>
              <span
                v-if="building.completionDate"
                class="text-[11px] text-(--ui-text-dimmed) tabular-nums flex items-center gap-1"
              >
                <UIcon name="i-solar-calendar-linear" class="size-3" />
                {{ building.completionDate }}
              </span>
            </div>
            <div
              v-if="building.totalApartmentsCount"
              class="flex items-center gap-3 text-[11px] text-(--ui-text-muted) tabular-nums mt-1"
            >
              <span>
                <span class="text-(--ui-text-dimmed)">всего</span>
                <span class="text-(--ui-text) font-medium ml-1">
                  {{ building.totalApartmentsCount }}
                </span>
              </span>
              <span class="flex items-center gap-1">
                <span class="size-1.5 rounded-full bg-emerald-500" />
                {{ building.freeApartmentsCount ?? 0 }}
              </span>
              <span class="flex items-center gap-1">
                <span class="size-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                {{ building.soldApartmentsCount ?? 0 }}
              </span>
              <span class="ml-2 flex items-center gap-1.5">
                <span
                  class="w-20 h-1 rounded-full bg-(--ui-bg-elevated) overflow-hidden"
                >
                  <span
                    class="block h-full bg-zinc-500"
                    :style="{ width: soldPct(building) + '%' }"
                  />
                </span>
                <span class="text-[10px] text-(--ui-text-dimmed)">
                  {{ soldPct(building) }}%
                </span>
              </span>
            </div>
          </div>

          <UIcon
            name="i-solar-alt-arrow-right-linear"
            class="size-4 text-(--ui-text-dimmed) opacity-0 group-hover:opacity-100 transition shrink-0"
          />
        </NuxtLink>
      </div>
    </AppDataCard>

    <AppEmptyState
      v-else
      icon="i-solar-buildings-linear"
      title="Дома не найдены"
      description="Создайте дом со страницы проекта или подключите интеграцию для импорта."
    />

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-4 flex justify-center">
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="pageSize"
      />
    </div>
  </PageContainer>
</template>
