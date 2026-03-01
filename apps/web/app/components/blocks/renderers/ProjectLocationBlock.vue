<script setup lang="ts">
defineProps<{
  projectId: string;
  showAddress: boolean;
  mapHeight: number;
  project?: {
    name: string;
    address: string | null;
    coordinates: string | null;
  } | null;
}>();

const { fadeUp } = useMotionPresets();
</script>

<template>
  <div v-if="project" class="section">
    <div class="container-web">
      <Motion as="div" v-bind="fadeUp">
        <h2 v-if="project.name" class="mb-6 text-2xl font-bold">{{ project.name }}</h2>

        <p
          v-if="showAddress && project.address"
          class="mb-6 flex items-start gap-2 text-[var(--web-text-secondary)]"
        >
          <Icon name="lucide:map-pin" class="mt-0.5 size-5 shrink-0 text-[var(--web-accent)]" />
          {{ project.address }}
        </p>

        <div
          class="flex items-center justify-center rounded-xl bg-[var(--web-bg-muted)]"
          :style="{ height: `${mapHeight}px` }"
        >
          <div class="text-center text-[var(--web-text-muted)]">
            <Icon name="lucide:map" class="mx-auto mb-2 size-10" />
            <p v-if="project.coordinates" class="text-sm">{{ project.coordinates }}</p>
            <p v-else class="text-sm">Карта будет добавлена позже</p>
          </div>
        </div>
      </Motion>
    </div>
  </div>
</template>
