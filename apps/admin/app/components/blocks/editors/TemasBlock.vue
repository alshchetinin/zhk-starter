<script setup lang="ts">
const model = defineModel<{
  title: string;
  member: Array<{ name: string; avatar: string | null }>;
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
    <UFormField label="Член команды" required>
      <RepeaterField
        :model-value="model.member"
        @update:model-value="set('member', $event)"
        :default-item="() => ({ name: '', avatar: null })"
        :min="2" :max="4"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="имя" required>
      <UInput :model-value="item.name" @update:model-value="update('name', $event)" />
    </UFormField>
    <UFormField label="Аватар" required>
      <ImageUpload :model-value="item.avatar" @update:model-value="update('avatar', $event)" folder="blocks" :per-usage="true" />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
  </div>
</template>
