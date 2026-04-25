<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const route = useRoute();
const id = computed(() => route.params.id as string);

const { data: project, isPending } = useQuery(
  computed(() =>
    $orpc.projects.getById.queryOptions({ input: { id: id.value } }),
  ),
);

const statusTone: Record<
  string,
  "success" | "warning" | "error" | "muted"
> = {
  active: "success",
  planning: "warning",
  completed: "muted",
  hidden: "muted",
};
const statusLabel: Record<string, string> = {
  active: "Активный",
  planning: "Планируется",
  completed: "Завершён",
  hidden: "Скрыт",
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

const activeTabIdx = computed(() => {
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
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <template v-else-if="project">
      <AppPageHeader
        :title="project.name"
        back="/projects"
        :crumbs="[
          { label: 'Проекты', to: '/projects' },
          { label: project.name },
          ...(isEditPage ? [{ label: 'Редактирование' }] : []),
        ]"
      >
        <template #actions>
          <AppStatusPill
            v-if="project.status"
            :tone="statusTone[project.status] ?? 'muted'"
            :label="statusLabel[project.status] ?? project.status"
            dot
          />
          <UButton
            v-if="!isEditPage"
            :to="`/projects/${id}/edit`"
            icon="i-tabler-pencil"
            variant="outline"
          >
            Редактировать
          </UButton>
        </template>
      </AppPageHeader>

      <!-- Tabs (hidden on edit page) -->
      <nav
        v-if="!isEditPage"
        class="mb-4 flex gap-0.5 overflow-x-auto border-b border-(--ui-border) -mx-1 px-1"
      >
        <NuxtLink
          v-for="(tab, i) in tabs"
          :key="tab.to"
          :to="tab.to"
          class="-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors"
          :class="
            activeTabIdx === i
              ? 'border-(--ui-text) text-(--ui-text)'
              : 'border-transparent text-(--ui-text-muted) hover:text-(--ui-text)'
          "
        >
          {{ tab.label }}
        </NuxtLink>
      </nav>

      <NuxtPage :project="project" />
    </template>
  </PageContainer>
</template>
