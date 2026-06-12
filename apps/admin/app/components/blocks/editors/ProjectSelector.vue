<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const model = defineModel<string>({ required: true });
const { $orpc } = useNuxtApp();

const { data: projectsData } = useQuery(
  computed(() => $orpc.projects.list.queryOptions({
    input: { page: 1, pageSize: 100 },
  })),
);

const items = computed(() =>
  projectsData.value?.data.map(p => ({ label: p.name, value: p.id })) ?? []
);
</script>

<template>
  <USelect v-model="model" :items="items" placeholder="Выберите проект" class="w-full" />
</template>
