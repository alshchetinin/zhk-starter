<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

// optional relation: канонический шаблон генерирует поле как `field?: string[]`
const model = defineModel<string[] | undefined>();
const { $orpc } = useNuxtApp();

const { data: contacts, isPending } = useQuery($orpc.contacts.list.queryOptions());

const items = computed(() =>
  (contacts.value ?? []).map((c) => ({ label: c.label, value: c.id })),
);
</script>

<template>
  <!-- не v-model: из-за нормализации `model ?? []` биндинг несимметричен -->
  <USelectMenu
    :model-value="model ?? []"
    :items="items"
    :loading="isPending"
    multiple
    value-key="value"
    placeholder="Выбрать контакты"
    class="w-full"
    @update:model-value="model = $event"
  />
</template>
