<script setup lang="ts">
const model = defineModel<{
  projectId: string;
  showAddress: boolean;
  mapHeight: number;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}

const { data: projectData } = useProjectData(computed(() => model.value.projectId || null));
</script>

<template>
  <div class="space-y-4">
    <ProjectSelector :model-value="model.projectId" @update:model-value="set('projectId', $event)" />

    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 text-sm">
        <UCheckbox :model-value="model.showAddress" @update:model-value="set('showAddress', Boolean($event))" />
        Показывать адрес
      </label>
    </div>

    <UFormField label="Высота карты (px)">
      <UInput
        type="number"
        :model-value="model.mapHeight"
        @update:model-value="set('mapHeight', Number($event) || 400)"
      />
    </UFormField>

    <!-- Preview -->
    <div v-if="!model.projectId" class="rounded-lg border border-dashed border-(--ui-border) p-6 text-center text-sm text-(--ui-text-muted)">
      Выберите проект для отображения карты
    </div>
    <template v-else-if="projectData">
      <div v-if="model.showAddress && projectData.address" class="text-sm">
        <span class="text-(--ui-text-muted)">Адрес:</span> {{ projectData.address }}
      </div>
      <div
        v-if="projectData.coordinates"
        class="rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) flex items-center justify-center text-sm text-(--ui-text-muted)"
        :style="{ height: `${Math.min(model.mapHeight, 300)}px` }"
      >
        <div class="text-center">
          <UIcon name="i-tabler-map-pin" class="size-8 mx-auto mb-1" />
          <p>Координаты: {{ projectData.coordinates }}</p>
        </div>
      </div>
      <div v-else class="rounded-lg border border-dashed border-(--ui-border) p-6 text-center text-sm text-(--ui-text-muted)">
        У проекта не указаны координаты
      </div>
    </template>
  </div>
</template>
