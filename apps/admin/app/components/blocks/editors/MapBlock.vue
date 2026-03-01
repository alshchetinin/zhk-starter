<script setup lang="ts">
const model = defineModel<{
  name: string;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Выбор" required>
      <USelect :model-value="model.name" @update:model-value="set('name', $event)" class="w-full" :items="[{ label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: '4', value: '4' }, { label: '5', value: '5' }]" />
    </UFormField>
  </div>
</template>
