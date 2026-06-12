<script setup lang="ts">
const model = defineModel<{
  projectId: string;
  showAddress: boolean;
  mapHeight: number;
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
    <UFormField label="Показывать адрес">
      <USwitch :model-value="model.showAddress" @update:model-value="set('showAddress', $event)" />
    </UFormField>
    <UFormField label="Высота карты (px)" required>
      <UInput :model-value="model.mapHeight" @update:model-value="set('mapHeight', Number($event))" type="number" />
    </UFormField>
  </div>
</template>
