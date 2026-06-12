<script setup lang="ts">
const model = defineModel<{
  projectId: string;
  showFree: boolean;
  showTotal: boolean;
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
    <UFormField label="Показывать свободные">
      <USwitch :model-value="model.showFree" @update:model-value="set('showFree', $event)" />
    </UFormField>
    <UFormField label="Показывать всего">
      <USwitch :model-value="model.showTotal" @update:model-value="set('showTotal', $event)" />
    </UFormField>
  </div>
</template>
