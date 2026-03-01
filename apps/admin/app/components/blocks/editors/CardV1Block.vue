<script setup lang="ts">
const model = defineModel<{
  items: Array<{ title: string; description?: string; image: string | null }>;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="карточки" required>
      <RepeaterField
        :model-value="model.items"
        @update:model-value="set('items', $event)"
        :default-item="() => ({ title: '', description: undefined, image: null })"
        :min="3" :max="3"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="Название" required>
      <UInput :model-value="item.title" @update:model-value="update('title', $event)" />
    </UFormField>
    <UFormField label="Описание">
      <UTextarea :model-value="item.description" @update:model-value="update('description', $event)" :rows="4" />
    </UFormField>
    <UFormField label="Картинка" required>
      <ImageUpload :model-value="item.image" @update:model-value="update('image', $event)" folder="blocks" />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
  </div>
</template>
