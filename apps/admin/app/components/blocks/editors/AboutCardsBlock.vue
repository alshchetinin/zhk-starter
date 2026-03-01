<script setup lang="ts">
const model = defineModel<{
  title: string;
  description?: string;
  items: Array<{ title: string; image: string | null }>;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Заголовок" description="Крупный заголовок секции" required>
      <UInput :model-value="model.title" @update:model-value="set('title', $event)" />
    </UFormField>
    <UFormField label="Описание">
      <UTextarea :model-value="model.description" @update:model-value="set('description', $event)" :rows="4" />
    </UFormField>
    <UFormField label="Карточки" required>
      <RepeaterField
        :model-value="model.items"
        @update:model-value="set('items', $event)"
        :default-item="() => ({ title: '', image: null })"
        :min="3"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="Название" required>
      <UInput :model-value="item.title" @update:model-value="update('title', $event)" />
    </UFormField>
    <UFormField label="Изображение" required>
      <ImageUpload :model-value="item.image" @update:model-value="update('image', $event)" folder="blocks" />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
  </div>
</template>
