<script setup lang="ts">
defineProps<{
  blockType: string;
}>();

const isDev = import.meta.dev;
</script>

<template>
  <div v-if="isDev" class="section">
    <div class="container-web">
      <div class="rounded-xl border-2 border-dashed border-[var(--web-border)] p-8 text-center text-sm text-[var(--web-text-muted)]">
        Неизвестный блок: <code class="font-mono bg-[var(--web-bg-subtle)] px-2 py-0.5 rounded">{{ blockType }}</code>
      </div>
    </div>
  </div>
</template>
