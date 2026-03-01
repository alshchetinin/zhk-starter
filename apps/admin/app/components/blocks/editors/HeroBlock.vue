<script setup lang="ts">
const model = defineModel<{
  title: string;
  description?: string;
  images: string[];
  primaryButtonText: string;
  primaryButtonUrl: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Название проекта" required>
      <UInput :model-value="model.title" @update:model-value="set('title', $event)" />
    </UFormField>
    <UFormField label="Описание" description="Краткое описание под заголовком">
      <UTextarea :model-value="model.description" @update:model-value="set('description', $event)" :rows="4" />
    </UFormField>
    <UFormField label="Фоновые изображения" required>
      <GalleryUpload :model-value="model.images" @update:model-value="set('images', $event)" />
    </UFormField>
    <UFormField label="Основная кнопка — текст" required>
      <UInput :model-value="model.primaryButtonText" @update:model-value="set('primaryButtonText', $event)" />
    </UFormField>
    <UFormField label="Основная кнопка — ссылка" required>
      <UInput :model-value="model.primaryButtonUrl" @update:model-value="set('primaryButtonUrl', $event)" type="url" placeholder="https://..." />
    </UFormField>
    <UFormField label="Вторая кнопка — текст">
      <UInput :model-value="model.secondaryButtonText" @update:model-value="set('secondaryButtonText', $event)" />
    </UFormField>
    <UFormField label="Вторая кнопка — ссылка">
      <UInput :model-value="model.secondaryButtonUrl" @update:model-value="set('secondaryButtonUrl', $event)" type="url" placeholder="https://..." />
    </UFormField>
  </div>
</template>
