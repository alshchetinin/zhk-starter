<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const { user } = useSession();

const { data, isPending } = useQuery($orpc.dashboard.stats.queryOptions());

const statCards = computed(() => {
  if (!data.value) return [];
  return [
    { label: "Projects", value: data.value.totalProjects, icon: "i-tabler-building", color: "blue", to: "/projects" },
    { label: "Total Apartments", value: data.value.totalApartments, icon: "i-tabler-home", color: "indigo", to: "/apartments" },
    { label: "Free", value: data.value.freeApartments, icon: "i-tabler-circle-check", color: "green", to: "/apartments" },
    { label: "Sold", value: data.value.soldApartments, icon: "i-tabler-circle-x", color: "red", to: "/apartments" },
    { label: "Buildings", value: data.value.totalBuildings, icon: "i-tabler-building-skyscraper", color: "purple", to: "/buildings" },
    { label: "Commerce", value: data.value.totalCommerce, icon: "i-tabler-shopping-cart", color: "amber", to: "/commerce" },
  ];
});
</script>

<template>
  <PageContainer>
    <div class="mb-6">
      <h1 class="text-2xl font-bold">Dashboard</h1>
      <p class="text-sm text-(--ui-text-muted)">
        Welcome back{{ user?.name ? `, ${user.name}` : '' }}
      </p>
    </div>

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Loading...</span>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="card in statCards"
        :key="card.label"
        :to="card.to"
        class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 transition-shadow hover:shadow-md"
      >
        <div class="flex items-center gap-3">
          <div
            class="rounded-lg p-2"
            :class="`bg-${card.color}-50 dark:bg-${card.color}-950`"
          >
            <UIcon
              :name="card.icon"
              class="size-5"
              :class="`text-${card.color}-600 dark:text-${card.color}-400`"
            />
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted)">{{ card.label }}</p>
            <p class="text-2xl font-bold">{{ card.value }}</p>
          </div>
        </div>
      </NuxtLink>
    </div>
  </PageContainer>
</template>
