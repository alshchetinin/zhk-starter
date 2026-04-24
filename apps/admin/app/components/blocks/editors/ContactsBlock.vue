<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const model = defineModel<{
  title?: string;
  contactIds: string[];
  showMap?: boolean;
}>({ required: true });

const { $orpc } = useNuxtApp();
const { data: contacts } = useQuery($orpc.contacts.list.queryOptions());

const items = computed(() =>
  (contacts.value ?? []).map((c) => ({ label: c.label, value: c.id })),
);

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Заголовок">
      <UInput :model-value="model.title" placeholder="Контакты" @update:model-value="set('title', $event as string)" />
    </UFormField>

    <UFormField label="Контакты" description="Выберите записи из справочника контактов">
      <USelectMenu
        :model-value="model.contactIds"
        :items="items"
        multiple
        value-key="value"
        placeholder="Выбрать контакты"
        class="w-full"
        @update:model-value="set('contactIds', $event)"
      />
    </UFormField>

    <UFormField label="Показывать карту">
      <USwitch :model-value="model.showMap ?? true" @update:model-value="set('showMap', $event)" />
    </UFormField>
  </div>
</template>
