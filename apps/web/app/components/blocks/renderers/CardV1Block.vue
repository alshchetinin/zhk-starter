<script setup lang="ts">
defineProps<{
  items: Array<{ title: string; description?: string; image: string }>;
}>();

const { staggerContainer, staggerChild } = useMotionPresets();
</script>

<template>
  <div class="section">
    <div class="container-web">
      <Motion
        as="div"
        :variants="staggerContainer"
        initial="hidden"
        whileInView="show"
        :inViewOptions="{ once: true }"
        class="grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        <Motion
          as="div"
          v-for="(card, i) in items"
          :key="i"
          :variants="staggerChild"
          class="overflow-hidden rounded-xl border border-[var(--web-border)]"
        >
          <img
            :src="card.image"
            :alt="card.title"
            :loading="i > 0 ? 'lazy' : undefined"
            class="aspect-[4/3] w-full object-cover"
          />
          <div class="p-5">
            <h3 class="text-lg font-semibold">{{ card.title }}</h3>
            <p v-if="card.description" class="mt-1.5 text-sm text-[var(--web-text-secondary)]">
              {{ card.description }}
            </p>
          </div>
        </Motion>
      </Motion>
    </div>
  </div>
</template>
