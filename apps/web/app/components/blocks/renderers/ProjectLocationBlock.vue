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
</script>

<template>
  <div v-if="project" class="section">
    <div class="container-web">
      <h2 v-if="project.name" class="text-2xl font-bold mb-6">{{ project.name }}</h2>

      <p
        v-if="showAddress && project.address"
        class="flex items-start gap-2 text-[var(--web-text-secondary)] mb-6"
      >
        <Icon name="lucide:map-pin" class="size-5 mt-0.5 shrink-0 text-[var(--web-accent)]" />
        {{ project.address }}
      </p>

      <div
        class="rounded-xl bg-[var(--web-bg-muted)] flex items-center justify-center"
        :style="{ height: `${mapHeight}px` }"
      >
        <div class="text-center text-[var(--web-text-muted)]">
          <Icon name="lucide:map" class="size-10 mx-auto mb-2" />
          <p v-if="project.coordinates" class="text-sm">{{ project.coordinates }}</p>
          <p v-else class="text-sm">Карта будет добавлена позже</p>
        </div>
      </div>
    </div>
  </div>
</template>
