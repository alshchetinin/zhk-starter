<script setup lang="ts">
const model = defineModel<{
  projectId: string;
  showFree: boolean;
  showTotal: boolean;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}

const { data: projectData } = useProjectData(computed(() => model.value.projectId || null));
</script>

<template>
  <div class="space-y-4">
    <ProjectSelector :model-value="model.projectId" @update:model-value="set('projectId', $event)" />

    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 text-sm">
        <UCheckbox :model-value="model.showFree" @update:model-value="set('showFree', Boolean($event))" />
        Свободные квартиры
      </label>
      <label class="flex items-center gap-2 text-sm">
        <UCheckbox :model-value="model.showTotal" @update:model-value="set('showTotal', Boolean($event))" />
        Всего квартир
      </label>
    </div>

    <!-- Preview -->
    <div v-if="!model.projectId" class="rounded-lg border border-dashed border-(--ui-border) p-6 text-center text-sm text-(--ui-text-muted)">
      Выберите проект для отображения статистики
    </div>
    <div v-else-if="projectData" class="grid grid-cols-2 gap-3">
      <div v-if="model.showFree" class="rounded-lg border border-(--ui-border) p-4 text-center">
        <p class="text-2xl font-bold">{{ projectData.freeApartmentsCount ?? 0 }}</p>
        <p class="text-xs text-(--ui-text-muted)">Свободных</p>
      </div>
      <div v-if="model.showTotal" class="rounded-lg border border-(--ui-border) p-4 text-center">
        <p class="text-2xl font-bold">{{ projectData.totalApartmentsCount ?? 0 }}</p>
        <p class="text-xs text-(--ui-text-muted)">Всего</p>
      </div>
    </div>
  </div>
</template>
