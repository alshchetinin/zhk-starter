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

const isEditPage = computed(() => route.path.endsWith("/edit"));

const tabs = computed(() => [
  { label: "Информация", to: `/projects/${id.value}` },
  { label: "Шахматка", to: `/projects/${id.value}/checkerboard` },
  { label: "Дома", to: `/projects/${id.value}/buildings` },
  { label: "Планировки", to: `/projects/${id.value}/layouts` },
  { label: "Квартиры", to: `/projects/${id.value}/apartments` },
  { label: "На сайте", to: `/projects/${id.value}/website` },
  { label: "Ход строительства", to: `/projects/${id.value}/progress` },
  { label: "Инфраструктура", to: `/projects/${id.value}/infrastructure` },
]);

const activeTab = computed(() => {
  if (route.path.includes("/infrastructure")) return 7;
  if (route.path.includes("/progress")) return 6;
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
        { label: 'Проекты', to: '/projects', icon: 'i-tabler-building' },
        { label: project?.name ?? '...' },
        ...(isEditPage ? [{ label: 'Редактирование' }] : []),
      ]"
      class="mb-6"
    />

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <template v-else-if="project">
      <!-- Header -->
      <div class="mb-6 flex items-center gap-3">
        <h1 class="text-2xl font-bold">{{ project.name }}</h1>
        <UBadge :color="statusColors[project.status ?? ''] ?? 'neutral'" variant="subtle">
          {{ project.status }}
        </UBadge>
        <div v-if="!isEditPage" class="ml-auto">
          <UButton
            variant="outline"
            icon="i-tabler-pencil"
            class="rounded-xl"
            :to="`/projects/${id}/edit`"
          >
            Редактировать
          </UButton>
        </div>
      </div>

      <!-- Tabs (hidden on edit page) -->
      <div v-if="!isEditPage" class="mb-6 flex gap-1 overflow-x-auto border-b border-(--ui-border)">
        <NuxtLink
          v-for="(tab, i) in tabs"
          :key="tab.to"
          :to="tab.to"
          class="-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors"
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
