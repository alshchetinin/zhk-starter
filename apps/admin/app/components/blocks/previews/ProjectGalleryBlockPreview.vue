<script setup lang="ts">
const props = defineProps<{
  data: {
    projectId: string;
    columns: "2" | "3" | "4";
    maxImages?: number;
  };
}>();

const { data: projectData } = useProjectData(computed(() => props.data.projectId || null));

const previewImages = computed(() => {
  const gallery = projectData.value?.gallery ?? [];
  return props.data.maxImages ? gallery.slice(0, props.data.maxImages) : gallery;
});
</script>

<template>
  <div v-if="!data.projectId" class="rounded-lg border border-dashed border-(--ui-border) p-6 text-center text-sm text-(--ui-text-muted)">
    Выберите проект для отображения галереи
  </div>
  <div v-else-if="previewImages.length" class="grid gap-2" :class="`grid-cols-${data.columns}`">
    <img
      v-for="(src, i) in previewImages"
      :key="i"
      :src="src"
      class="w-full h-24 object-cover rounded-md"
    />
  </div>
  <div v-else class="rounded-lg border border-dashed border-(--ui-border) p-6 text-center text-sm text-(--ui-text-muted)">
    У проекта пока нет изображений в галерее
  </div>
</template>
