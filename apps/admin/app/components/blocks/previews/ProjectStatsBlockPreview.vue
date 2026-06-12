<script setup lang="ts">
const props = defineProps<{
  data: {
    projectId: string;
    showFree: boolean;
    showTotal: boolean;
  };
}>();

const { data: projectData, isPending } = useProjectData(computed(() => props.data.projectId || null));
</script>

<template>
  <div v-if="!data.projectId" class="rounded-lg border border-dashed border-(--ui-border) p-6 text-center text-sm text-(--ui-text-muted)">
    Выберите проект для отображения статистики
  </div>
  <p v-else-if="isPending" class="text-xs text-(--ui-text-muted)">Загрузка данных проекта…</p>
  <div v-else-if="projectData" class="grid grid-cols-2 gap-3">
    <div v-if="data.showFree" class="rounded-lg border border-(--ui-border) p-4 text-center">
      <p class="text-2xl font-bold">{{ projectData.freeApartmentsCount ?? 0 }}</p>
      <p class="text-xs text-(--ui-text-muted)">Свободных</p>
    </div>
    <div v-if="data.showTotal" class="rounded-lg border border-(--ui-border) p-4 text-center">
      <p class="text-2xl font-bold">{{ projectData.totalApartmentsCount ?? 0 }}</p>
      <p class="text-xs text-(--ui-text-muted)">Всего</p>
    </div>
  </div>
</template>
