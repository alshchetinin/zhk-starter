<script setup lang="ts">
defineProps<{
  items: Array<{ title: string; description?: string; image: string }>;
}>();
</script>

<template>
  <div class="section">
    <div class="container-web">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="(card, i) in items"
          :key="i"
          class="rounded-xl overflow-hidden border border-[var(--web-border)]"
        >
          <img
            :src="card.image"
            :alt="card.title"
            :loading="i > 0 ? 'lazy' : undefined"
            class="w-full aspect-[4/3] object-cover"
          >
          <div class="p-5">
            <h3 class="text-lg font-semibold">{{ card.title }}</h3>
            <p v-if="card.description" class="mt-1.5 text-sm text-[var(--web-text-secondary)]">
              {{ card.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
