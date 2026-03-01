<script setup lang="ts">
const model = defineModel<{
  items: Array<{ name: string; picture: string | null }>;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Имя" required>
      <RepeaterField
        :model-value="model.items"
        @update:model-value="set('items', $event)"
        :default-item="() => ({ name: '', picture: null })"
        :min="4"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="Имя" required>
      <UInput :model-value="item.name" @update:model-value="update('name', $event)" />
    </UFormField>
    <UFormField label="Фото" required>
      <ImageUpload :model-value="item.picture" @update:model-value="update('picture', $event)" folder="blocks" />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
  </div>
</template>
