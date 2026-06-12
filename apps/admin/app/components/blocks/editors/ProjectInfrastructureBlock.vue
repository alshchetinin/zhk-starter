<script setup lang="ts">
const model = defineModel<{
  projectId: string;
  mapHeight: number;
  showCategories: boolean;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Проект" required>
      <ProjectSelector :model-value="model.projectId" @update:model-value="set('projectId', $event)" />
    </UFormField>
    <UFormField label="Высота карты (px)" required>
      <UInput :model-value="model.mapHeight" @update:model-value="set('mapHeight', Number($event))" type="number" />
    </UFormField>
    <UFormField label="Показывать фильтр по категориям">
      <USwitch :model-value="model.showCategories" @update:model-value="set('showCategories', $event)" />
    </UFormField>
  </div>
</template>
