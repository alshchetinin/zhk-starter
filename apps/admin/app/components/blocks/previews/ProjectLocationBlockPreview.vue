<script setup lang="ts">
const props = defineProps<{
  data: {
    projectId: string;
    showAddress: boolean;
    mapHeight: number;
  };
}>();

const { data: projectData } = useProjectData(computed(() => props.data.projectId || null));
</script>

<template>
  <div class="space-y-4">
    <div v-if="!data.projectId" class="rounded-lg border border-dashed border-(--ui-border) p-6 text-center text-sm text-(--ui-text-muted)">
      Выберите проект для отображения карты
    </div>
    <template v-else-if="projectData">
      <div v-if="data.showAddress && projectData.address" class="text-sm">
        <span class="text-(--ui-text-muted)">Адрес:</span> {{ projectData.address }}
      </div>
      <div
        v-if="projectData.coordinates"
        class="rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) flex items-center justify-center text-sm text-(--ui-text-muted)"
        :style="{ height: `${Math.min(data.mapHeight, 300)}px` }"
      >
        <div class="text-center">
          <UIcon name="i-solar-map-point-linear" class="size-8 mx-auto mb-1" />
          <p>Координаты: {{ projectData.coordinates }}</p>
        </div>
      </div>
      <div v-else class="rounded-lg border border-dashed border-(--ui-border) p-6 text-center text-sm text-(--ui-text-muted)">
        У проекта не указаны координаты
      </div>
    </template>
  </div>
</template>
