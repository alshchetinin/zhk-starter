<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const model = defineModel<string[]>({ required: true });
const { $orpc } = useNuxtApp();

const { data: contacts } = useQuery($orpc.contacts.list.queryOptions());

const items = computed(() =>
  (contacts.value ?? []).map((c) => ({ label: c.label, value: c.id })),
);
</script>

<template>
  <USelectMenu
    :model-value="model"
    :items="items"
    multiple
    value-key="value"
    placeholder="Выбрать контакты"
    class="w-full"
    @update:model-value="model = $event"
  />
</template>
