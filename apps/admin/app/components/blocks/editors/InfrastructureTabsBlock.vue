<script setup lang="ts">
const model = defineModel<{
  subtitle?: string;
  title: string;
  tabs: Array<{ label: string; title: string; description?: string; image: string | null }>;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Подзаголовок">
      <UInput :model-value="model.subtitle" @update:model-value="set('subtitle', $event)" />
    </UFormField>
    <UFormField label="Заголовок" required>
      <UInput :model-value="model.title" @update:model-value="set('title', $event)" />
    </UFormField>
    <UFormField label="Табы" required>
      <RepeaterField
        :model-value="model.tabs"
        @update:model-value="set('tabs', $event)"
        :default-item="() => ({ label: '', title: '', description: undefined, image: null })"
        :min="2" :max="8"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="Название таба" required>
      <UInput :model-value="item.label" @update:model-value="update('label', $event)" />
    </UFormField>
    <UFormField label="Заголовок контента" required>
      <UInput :model-value="item.title" @update:model-value="update('title', $event)" />
    </UFormField>
    <UFormField label="Описание">
      <UTextarea :model-value="item.description" @update:model-value="update('description', $event)" :rows="4" />
    </UFormField>
    <UFormField label="Изображение" required>
      <ImageUpload :model-value="item.image" @update:model-value="update('image', $event)" folder="blocks" :per-usage="true" />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
  </div>
</template>
