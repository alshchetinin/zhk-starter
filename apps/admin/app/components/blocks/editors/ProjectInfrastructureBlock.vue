<script setup lang="ts">
const model = defineModel<{
  projectId: string;
  mapHeight: number;
  showCategories: boolean;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}

const { data: projectData } = useProjectData(computed(() => model.value.projectId || null));

const pinsCount = computed(() => {
  const infra = (projectData.value as any)?.infrastructurePins;
  return Array.isArray(infra) ? infra.length : 0;
});

const categoriesCount = computed(() => {
  const cats = (projectData.value as any)?.infrastructureCategories;
  return Array.isArray(cats) ? cats.length : 0;
});
</script>

<template>
  <div class="space-y-4">
    <ProjectSelector :model-value="model.projectId" @update:model-value="set('projectId', $event)" />

    <UFormField label="Высота карты (px)">
      <UInput
        type="number"
        :model-value="model.mapHeight"
        @update:model-value="set('mapHeight', Number($event) || 500)"
      />
    </UFormField>

    <label class="flex items-center gap-2 text-sm">
      <UCheckbox :model-value="model.showCategories" @update:model-value="set('showCategories', Boolean($event))" />
      Показывать фильтр по категориям
    </label>

    <!-- Preview -->
    <div v-if="!model.projectId" class="rounded-lg border border-dashed border-(--ui-border) p-6 text-center text-sm text-(--ui-text-muted)">
      Выберите проект для отображения инфраструктуры
    </div>
    <div v-else class="rounded-lg border border-(--ui-border) p-4 text-sm text-(--ui-text-muted) space-y-1">
      <div>Категорий: <strong>{{ categoriesCount }}</strong></div>
      <div>Объектов на карте: <strong>{{ pinsCount }}</strong></div>
      <p v-if="pinsCount === 0" class="text-xs text-(--ui-text-dimmed) mt-2">
        Добавьте объекты инфраструктуры на вкладке "Инфраструктура" проекта
      </p>
    </div>
  </div>
</template>
