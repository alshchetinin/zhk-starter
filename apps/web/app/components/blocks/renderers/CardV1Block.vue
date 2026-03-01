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
        <Motion as="div" v-for="(card, i) in items" :key="i" :variants="staggerChild">
          <UiCard hoverable>
            <template #header>
              <img
                :src="card.image"
                :alt="card.title"
                :loading="i > 0 ? 'lazy' : undefined"
                class="aspect-[4/3] w-full object-cover"
              />
            </template>
            <h3 class="text-lg font-semibold">{{ card.title }}</h3>
            <p v-if="card.description" class="mt-1.5 text-sm text-[var(--web-text-secondary)]">
              {{ card.description }}
            </p>
          </UiCard>
        </Motion>
      </Motion>
    </div>
  </div>
</template>
