<script setup lang="ts">
const model = defineModel<{
  url: string | null;
  alt: string;
  caption: string;
}>({ required: true });
</script>

<template>
  <div class="space-y-4">
    <UFormField label="URL изображения">
      <ImageUpload v-model="model.url" folder="blocks" />
    </UFormField>
    <UFormField label="Alt-текст">
      <UInput v-model="model.alt" />
    </UFormField>
    <UFormField label="Подпись">
      <UTextarea v-model="model.caption" :rows="4" />
    </UFormField>
  </div>
</template>
