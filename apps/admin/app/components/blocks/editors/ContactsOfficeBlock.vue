<script setup lang="ts">
const model = defineModel<{
  title: string;
  phone: string;
  email: string;
  address: string;
  mapCoordinates?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  socials?: Array<{ type: string; url: string }>;
  departments: Array<{ name: string; phone: string; email: string }>;
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
    <UFormField label="Основной телефон" required>
      <UInput :model-value="model.phone" @update:model-value="set('phone', $event)" />
    </UFormField>
    <UFormField label="Основной email" required>
      <UInput :model-value="model.email" @update:model-value="set('email', $event)" />
    </UFormField>
    <UFormField label="Адрес" required>
      <UInput :model-value="model.address" @update:model-value="set('address', $event)" />
    </UFormField>
    <UFormField label="Координаты карты (lat,lng)" description="Широта и долгота через запятую">
      <UInput :model-value="model.mapCoordinates" @update:model-value="set('mapCoordinates', $event)" />
    </UFormField>
    <UFormField label="Текст кнопки">
      <UInput :model-value="model.buttonLabel" @update:model-value="set('buttonLabel', $event)" />
    </UFormField>
    <UFormField label="Ссылка кнопки">
      <UInput :model-value="model.buttonUrl" @update:model-value="set('buttonUrl', $event)" type="url" placeholder="https://..." />
    </UFormField>
    <UFormField label="Соцсети">
      <RepeaterField
        :model-value="model.socials"
        @update:model-value="set('socials', $event)"
        :default-item="() => ({ type: 'telegram', url: '' })"
        :min="1" :max="5"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="Соцсеть" required>
      <USelect :model-value="item.type" @update:model-value="update('type', $event)" class="w-full" :items="[{ label: 'telegram', value: 'telegram' }, { label: 'whatsapp', value: 'whatsapp' }, { label: 'vk', value: 'vk' }]" />
    </UFormField>
    <UFormField label="Ссылка" required>
      <UInput :model-value="item.url" @update:model-value="update('url', $event)" type="url" placeholder="https://..." />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
    <UFormField label="Отделы" required>
      <RepeaterField
        :model-value="model.departments"
        @update:model-value="set('departments', $event)"
        :default-item="() => ({ name: '', phone: '', email: '' })"
        :min="1" :max="8"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="Название отдела" required>
      <UInput :model-value="item.name" @update:model-value="update('name', $event)" />
    </UFormField>
    <UFormField label="Телефон" required>
      <UInput :model-value="item.phone" @update:model-value="update('phone', $event)" />
    </UFormField>
    <UFormField label="Email" required>
      <UInput :model-value="item.email" @update:model-value="update('email', $event)" />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
  </div>
</template>
