<script setup lang="ts">
const model = defineModel<{
  title: string;
  phone: string;
  email: string;
  address: string;
  buttonText?: string;
  buttonUrl?: string;
  departments?: Array<{ name: string; phone: string; email?: string }>;
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
    <UFormField label="Телефон" required>
      <UInput :model-value="model.phone" @update:model-value="set('phone', $event)" />
    </UFormField>
    <UFormField label="Email" required>
      <UInput :model-value="model.email" @update:model-value="set('email', $event)" />
    </UFormField>
    <UFormField label="Адрес" required>
      <UInput :model-value="model.address" @update:model-value="set('address', $event)" />
    </UFormField>
    <UFormField label="Кнопка — текст">
      <UInput :model-value="model.buttonText" @update:model-value="set('buttonText', $event)" />
    </UFormField>
    <UFormField label="Кнопка — ссылка">
      <UInput :model-value="model.buttonUrl" @update:model-value="set('buttonUrl', $event)" type="url" placeholder="https://..." />
    </UFormField>
    <UFormField label="Отделы">
      <RepeaterField
        :model-value="model.departments"
        @update:model-value="set('departments', $event)"
        :default-item="() => ({ name: '', phone: '', email: undefined })"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="Название отдела" required>
      <UInput :model-value="item.name" @update:model-value="update('name', $event)" />
    </UFormField>
    <UFormField label="Телефон" required>
      <UInput :model-value="item.phone" @update:model-value="update('phone', $event)" />
    </UFormField>
    <UFormField label="Email">
      <UInput :model-value="item.email" @update:model-value="update('email', $event)" />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
  </div>
</template>
