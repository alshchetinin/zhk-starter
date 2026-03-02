<script setup lang="ts">
const model = defineModel<{
  title: string;
  description?: string;
  tabs: Array<{ label: string; title: string; description?: string; images: string[] }>;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Заголовок" required>
      <UInput :model-value="model.title" @update:model-value="set('title', $event)" />
    </UFormField>
    <UFormField label="Описание">
      <UTextarea :model-value="model.description" @update:model-value="set('description', $event)" :rows="4" />
    </UFormField>
    <UFormField label="Табы" required>
      <RepeaterField
        :model-value="model.tabs"
        @update:model-value="set('tabs', $event)"
        :default-item="() => ({ label: '', title: '', description: undefined, images: [] })"
        :min="2" :max="6"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="Название таба" required>
      <UInput :model-value="item.label" @update:model-value="update('label', $event)" />
    </UFormField>
    <UFormField label="Заголовок контента" required>
      <UInput :model-value="item.title" @update:model-value="update('title', $event)" />
    </UFormField>
    <UFormField label="Описание контента">
      <UTextarea :model-value="item.description" @update:model-value="update('description', $event)" :rows="4" />
    </UFormField>
    <UFormField label="Слайдер изображений" required>
      <GalleryUpload :model-value="item.images" @update:model-value="update('images', $event)" />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
  </div>
</template>
