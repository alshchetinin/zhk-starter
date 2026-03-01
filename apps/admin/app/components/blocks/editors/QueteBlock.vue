<script setup lang="ts">
const model = defineModel<{
  text: string;
  name: string;
}>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Текст">
      <UTextarea v-model="model.text" :rows="4" />
    </UFormField>
    <UFormField label="Имя">
      <USelect v-model="model.name" :items="[]" />
    </UFormField>
  </div>
</template>
