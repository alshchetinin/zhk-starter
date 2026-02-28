<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const route = useRoute();
const id = computed(() => route.params.id as string);

const { data: project, isPending } = useQuery(
  computed(() => $orpc.projects.getById.queryOptions({ input: { id: id.value } })),
);

const statusColors: Record<string, "success" | "warning" | "error" | "neutral"> = {
  active: "success",
  planning: "warning",
  completed: "error",
  hidden: "neutral",
};

const tabs = computed(() => [
  { label: "Информация", to: `/projects/${id.value}` },
  { label: "Шахматка", to: `/projects/${id.value}/checkerboard` },
  { label: "Дома", to: `/projects/${id.value}/buildings` },
  { label: "Планировки", to: `/projects/${id.value}/layouts` },
  { label: "Квартиры", to: `/projects/${id.value}/apartments` },
  { label: "На сайте", to: `/projects/${id.value}/website` },
]);

const activeTab = computed(() => {
  if (route.path.includes("/website")) return 5;
  if (route.path.includes("/apartments")) return 4;
  if (route.path.includes("/layouts")) return 3;
  if (route.path.includes("/buildings")) return 2;
  if (route.path.includes("/checkerboard")) return 1;
  return 0;
});
</script>

<template>
  <PageContainer>
    <!-- Breadcrumb -->
    <UBreadcrumb
      :items="[
        { label: 'Projects', to: '/projects', icon: 'i-tabler-building' },
        { label: project?.name ?? '...' },
      ]"
      class="mb-6"
    />

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Loading...</span>
    </div>

    <template v-else-if="project">
      <!-- Header -->
      <div class="mb-6 flex items-center gap-3">
        <h1 class="text-2xl font-bold">{{ project.name }}</h1>
        <UBadge :color="statusColors[project.status ?? ''] ?? 'neutral'" variant="subtle">
          {{ project.status }}
        </UBadge>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 border-b border-(--ui-border) overflow-x-auto">
        <NuxtLink
          v-for="(tab, i) in tabs"
          :key="tab.to"
          :to="tab.to"
          class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap"
          :class="
            activeTab === i
              ? 'border-(--ui-primary) text-(--ui-primary)'
              : 'border-transparent text-(--ui-text-muted) hover:text-(--ui-text)'
          "
        >
          {{ tab.label }}
        </NuxtLink>
      </div>

      <!-- Tab content -->
      <NuxtPage :project="project" />
    </template>
  </PageContainer>
</template>
