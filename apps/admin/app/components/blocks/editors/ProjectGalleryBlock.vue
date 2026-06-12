<script setup lang="ts">
const model = defineModel<{
  projectId: string;
  columns: string;
  maxImages?: number;
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
    <UFormField label="Колонки" required>
      <USelect :model-value="model.columns" @update:model-value="set('columns', $event)" class="w-full" :items="[{ label: '2', value: '2' }, { label: '3', value: '3' }, { label: '4', value: '4' }]" />
    </UFormField>
    <UFormField label="Макс. изображений">
      <UInput :model-value="model.maxImages" @update:model-value="set('maxImages', Number($event))" type="number" />
    </UFormField>
  </div>
</template>
