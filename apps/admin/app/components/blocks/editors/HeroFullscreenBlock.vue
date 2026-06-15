<script setup lang="ts">
const model = defineModel<{
  title: string;
  description?: string;
  images: string[];
  address: string;
  district?: string;
  walkTime?: string;
  driveTime?: string;
  buildings: Array<{ label: string; date: string }>;
  primaryButtonLabel?: string;
  primaryButtonUrl?: string;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Название проекта" required>
      <UInput :model-value="model.title" @update:model-value="set('title', $event)" />
    </UFormField>
    <UFormField label="Описание">
      <UTextarea :model-value="model.description" @update:model-value="set('description', $event)" :rows="4" />
    </UFormField>
    <UFormField label="Фоновые изображения" required>
      <GalleryUpload :model-value="model.images" @update:model-value="set('images', $event)" :per-usage="true" />
    </UFormField>
    <UFormField label="Адрес" required>
      <UInput :model-value="model.address" @update:model-value="set('address', $event)" />
    </UFormField>
    <UFormField label="Район">
      <UInput :model-value="model.district" @update:model-value="set('district', $event)" />
    </UFormField>
    <UFormField label="Пешком до метро">
      <UInput :model-value="model.walkTime" @update:model-value="set('walkTime', $event)" />
    </UFormField>
    <UFormField label="На машине до центра">
      <UInput :model-value="model.driveTime" @update:model-value="set('driveTime', $event)" />
    </UFormField>
    <UFormField label="Сроки сдачи домов" required>
      <RepeaterField
        :model-value="model.buildings"
        @update:model-value="set('buildings', $event)"
        :default-item="() => ({ label: '', date: '' })"
        :min="1" :max="6"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
    <UFormField label="Название дома" required>
      <UInput :model-value="item.label" @update:model-value="update('label', $event)" />
    </UFormField>
    <UFormField label="Срок сдачи" required>
      <UInput :model-value="item.date" @update:model-value="update('date', $event)" />
    </UFormField>
          </div>
        </template>
      </RepeaterField>
    </UFormField>
    <UFormField label="Текст основной кнопки">
      <UInput :model-value="model.primaryButtonLabel" @update:model-value="set('primaryButtonLabel', $event)" />
    </UFormField>
    <UFormField label="Ссылка основной кнопки">
      <UInput :model-value="model.primaryButtonUrl" @update:model-value="set('primaryButtonUrl', $event)" type="url" placeholder="https://..." />
    </UFormField>
    <UFormField label="Текст доп. кнопки">
      <UInput :model-value="model.secondaryButtonLabel" @update:model-value="set('secondaryButtonLabel', $event)" />
    </UFormField>
    <UFormField label="Ссылка доп. кнопки">
      <UInput :model-value="model.secondaryButtonUrl" @update:model-value="set('secondaryButtonUrl', $event)" type="url" placeholder="https://..." />
    </UFormField>
  </div>
</template>
