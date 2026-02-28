<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

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
  computed(() =>
    $orpc.buildings.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        projectId: projectFilter.value || undefined,
      },
    }),
  ),
);
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Buildings</h1>
      <USelect
        v-model="projectFilter"
        :items="projectItems"
        placeholder="All Projects"
        class="w-48"
      />
    </div>

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Loading...</span>
    </div>

    <div v-else-if="data?.data.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="building in data.data"
        :key="building.id"
        :to="`/buildings/${building.id}`"
        class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-5 transition-shadow hover:shadow-md"
      >
        <div class="flex items-center gap-2 mb-2">
          <UIcon name="i-tabler-building-skyscraper" class="size-5 text-(--ui-text-muted)" />
          <h3 class="font-semibold truncate">{{ building.name }}</h3>
        </div>

        <p v-if="building.project" class="text-sm text-(--ui-text-muted) mb-2">
          {{ building.project.name }}
        </p>

        <div v-if="building.completionDate" class="flex items-center gap-1 text-xs text-(--ui-text-muted) mb-3">
          <UIcon name="i-tabler-calendar" class="size-3" />
          <span>{{ building.completionDate }}</span>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center border-t border-(--ui-border) pt-3">
          <div>
            <p class="text-xs text-(--ui-text-muted)">Total</p>
            <p class="text-sm font-semibold">{{ building.totalApartmentsCount ?? 0 }}</p>
          </div>
          <div>
            <p class="text-xs text-(--ui-text-muted)">Free</p>
            <p class="text-sm font-semibold text-green-600">{{ building.freeApartmentsCount ?? 0 }}</p>
          </div>
          <div>
            <p class="text-xs text-(--ui-text-muted)">Sold</p>
            <p class="text-sm font-semibold">{{ building.soldApartmentsCount ?? 0 }}</p>
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-12 text-center">
      <UIcon name="i-tabler-building-off" class="mx-auto size-12 text-(--ui-text-muted)" />
      <p class="mt-2 text-(--ui-text-muted)">No buildings found</p>
    </div>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-6 flex justify-center">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>
  </PageContainer>
</template>
