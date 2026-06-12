<script setup lang="ts">
const model = defineModel<{
  title?: string;
  contactIds: string[];
  showMap: boolean;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Заголовок">
      <UInput :model-value="model.title" @update:model-value="set('title', $event)" />
    </UFormField>
    <UFormField label="Контакты" description="Выберите записи из справочника контактов" required>
      <ContactsSelector :model-value="model.contactIds" @update:model-value="set('contactIds', $event)" />
    </UFormField>
    <UFormField label="Показывать карту">
      <USwitch :model-value="model.showMap" @update:model-value="set('showMap', $event)" />
    </UFormField>
  </div>
</template>
