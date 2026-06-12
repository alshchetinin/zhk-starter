<script setup lang="ts">
const props = defineProps<{
  data: {
    projectId: string;
  };
}>();

const { data: projectData } = useProjectData(computed(() => props.data.projectId || null));

const pinsCount = computed(() => {
  const infra = (projectData.value as any)?.infrastructurePins;
  return Array.isArray(infra) ? infra.length : 0;
});

const categoriesCount = computed(() => {
  const cats = (projectData.value as any)?.infrastructureCategories;
  return Array.isArray(cats) ? cats.length : 0;
});
</script>

<template>
  <div v-if="!data.projectId" class="rounded-lg border border-dashed border-(--ui-border) p-6 text-center text-sm text-(--ui-text-muted)">
    Выберите проект для отображения инфраструктуры
  </div>
  <div v-else class="rounded-lg border border-(--ui-border) p-4 text-sm text-(--ui-text-muted) space-y-1">
    <div>Категорий: <strong>{{ categoriesCount }}</strong></div>
    <div>Объектов на карте: <strong>{{ pinsCount }}</strong></div>
    <p v-if="pinsCount === 0" class="text-xs text-(--ui-text-dimmed) mt-2">
      Добавьте объекты инфраструктуры на вкладке "Инфраструктура" проекта
    </p>
  </div>
</template>
