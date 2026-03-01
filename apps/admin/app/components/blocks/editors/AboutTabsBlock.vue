<script setup lang="ts">
const model = defineModel<{
  title: string;
  description?: string;
  tabs: Array<{ label: string; image: string | null; subtitle: string; text?: string }>;
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
    <UFormField label="Вводный текст">
      <UTextarea :model-value="model.description" @update:model-value="set('description', $event)" :rows="4" />
    </UFormField>
    <UFormField label="Табы" required>
      <RepeaterField
        :model-value="model.tabs"
        @update:model-value="set('tabs', $event)"
        :default-item="() => ({ label: '', image: null, subtitle: '', text: undefined })"
        :min="2"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="Название таба" required>
      <UInput :model-value="item.label" @update:model-value="update('label', $event)" />
    </UFormField>
    <UFormField label="Изображение" required>
      <ImageUpload :model-value="item.image" @update:model-value="update('image', $event)" folder="blocks" />
    </UFormField>
    <UFormField label="Подзаголовок" required>
      <UInput :model-value="item.subtitle" @update:model-value="update('subtitle', $event)" />
    </UFormField>
    <UFormField label="Описание">
      <UTextarea :model-value="item.text" @update:model-value="update('text', $event)" :rows="4" />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
  </div>
</template>
