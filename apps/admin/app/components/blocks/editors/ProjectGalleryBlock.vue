<script setup lang="ts">
const model = defineModel<{
  projectId: string;
  columns: string;
  maxImages?: number;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}

const { data: projectData } = useProjectData(computed(() => model.value.projectId || null));

const columnsOptions = [
  { label: "2 колонки", value: "2" },
  { label: "3 колонки", value: "3" },
  { label: "4 колонки", value: "4" },
];

const previewImages = computed(() => {
  const gallery = projectData.value?.gallery ?? [];
  return model.value.maxImages ? gallery.slice(0, model.value.maxImages) : gallery;
});
</script>

<template>
  <div class="space-y-4">
    <ProjectSelector :model-value="model.projectId" @update:model-value="set('projectId', $event)" />

    <UFormField label="Колонки">
      <USelect :model-value="model.columns" :items="columnsOptions" @update:model-value="set('columns', $event)" />
    </UFormField>

    <UFormField label="Макс. изображений">
      <UInput
        type="number"
        :model-value="model.maxImages"
        placeholder="Все"
        @update:model-value="set('maxImages', $event ? Number($event) : undefined)"
      />
    </UFormField>

    <!-- Preview -->
    <div v-if="!model.projectId" class="rounded-lg border border-dashed border-(--ui-border) p-6 text-center text-sm text-(--ui-text-muted)">
      Выберите проект для отображения галереи
    </div>
    <div v-else-if="previewImages.length" class="grid gap-2" :class="`grid-cols-${model.columns}`">
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
  </div>
</template>
