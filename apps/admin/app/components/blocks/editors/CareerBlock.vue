<script setup lang="ts">
const model = defineModel<{
  title: string;
  description?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  vacancies: Array<{ title: string; location: string; company: string; url?: string }>;
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
    <UFormField label="Текст кнопки">
      <UInput :model-value="model.buttonLabel" @update:model-value="set('buttonLabel', $event)" />
    </UFormField>
    <UFormField label="URL кнопки">
      <UInput :model-value="model.buttonUrl" @update:model-value="set('buttonUrl', $event)" type="url" placeholder="https://..." />
    </UFormField>
    <UFormField label="Вакансии" required>
      <RepeaterField
        :model-value="model.vacancies"
        @update:model-value="set('vacancies', $event)"
        :default-item="() => ({ title: '', location: '', company: '', url: undefined })"
        :min="1" :max="12"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="Название" required>
      <UInput :model-value="item.title" @update:model-value="update('title', $event)" />
    </UFormField>
    <UFormField label="Город" required>
      <UInput :model-value="item.location" @update:model-value="update('location', $event)" />
    </UFormField>
    <UFormField label="Компания / объект" required>
      <UInput :model-value="item.company" @update:model-value="update('company', $event)" />
    </UFormField>
    <UFormField label="Ссылка">
      <UInput :model-value="item.url" @update:model-value="update('url', $event)" type="url" placeholder="https://..." />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
  </div>
</template>
