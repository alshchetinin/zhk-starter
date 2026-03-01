<script setup lang="ts">
const model = defineModel<{
  name: string;
  picture: string | null;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Имя" required>
      <UInput :model-value="model.name" @update:model-value="set('name', $event)" />
    </UFormField>
    <UFormField label="Картинка" required>
      <ImageUpload :model-value="model.picture" @update:model-value="set('picture', $event)" folder="blocks" />
    </UFormField>
  </div>
</template>
