<script setup lang="ts">
const model = defineModel<{
  title: string;
  description?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  image: string | null;
  stats: Array<{ value: string; label: string }>;
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
    <UFormField label="Текст ссылки">
      <UInput :model-value="model.buttonLabel" @update:model-value="set('buttonLabel', $event)" />
    </UFormField>
    <UFormField label="URL ссылки">
      <UInput :model-value="model.buttonUrl" @update:model-value="set('buttonUrl', $event)" type="url" placeholder="https://..." />
    </UFormField>
    <UFormField label="Изображение" required>
      <ImageUpload :model-value="model.image" @update:model-value="set('image', $event)" folder="blocks" :per-usage="true" />
    </UFormField>
    <UFormField label="Статистика" required>
      <RepeaterField
        :model-value="model.stats"
        @update:model-value="set('stats', $event)"
        :default-item="() => ({ value: '', label: '' })"
        :min="2" :max="6"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="Значение" required>
      <UInput :model-value="item.value" @update:model-value="update('value', $event)" />
    </UFormField>
    <UFormField label="Подпись" required>
      <UInput :model-value="item.label" @update:model-value="update('label', $event)" />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
  </div>
</template>
