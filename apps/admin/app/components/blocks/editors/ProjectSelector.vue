<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

// optional relation: канонический шаблон генерирует поле как `field?: string`
const model = defineModel<string | undefined>();
const { $orpc } = useNuxtApp();

const { data: projectsData, isPending } = useQuery(
  computed(() => $orpc.projects.list.queryOptions({
    input: { page: 1, pageSize: 100 },
  })),
);

const items = computed(() =>
  projectsData.value?.data.map(p => ({ label: p.name, value: p.id })) ?? []
);
</script>

<template>
  <USelect v-model="model" :items="items" :loading="isPending" placeholder="Выберите проект" class="w-full" />
</template>
