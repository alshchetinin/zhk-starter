<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  items: Array<{ title: string; image: string | null }>;
}>();

const { fadeUp, staggerContainer, staggerChild } = useMotionPresets();
</script>

<template>
  <div class="section">
    <div class="container-web">
      <!-- Header -->
      <Motion as="div" v-bind="fadeUp">
        <h2 class="max-w-4xl text-3xl font-bold leading-tight tracking-tight text-[var(--web-text-primary)] md:text-4xl lg:text-5xl">
          {{ title }}
        </h2>
        <p v-if="description" class="mt-6 max-w-2xl text-[var(--web-text-secondary)] md:ml-auto">
          {{ description }}
        </p>
      </Motion>

      <!-- Cards grid -->
      <Motion
        as="div"
        :variants="staggerContainer"
        initial="hidden"
        whileInView="show"
        :inViewOptions="{ once: true }"
        class="mt-10 grid gap-4 md:grid-cols-3"
      >
        <Motion
          as="div"
          v-for="(item, i) in items"
          :key="i"
          :variants="staggerChild"
          class="group relative overflow-hidden rounded-2xl"
        >
          <img
            v-if="item.image"
            :src="item.image"
            :alt="item.title"
            class="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
            :loading="i > 0 ? 'lazy' : undefined"
          />
          <div v-else class="flex aspect-[4/5] items-center justify-center bg-[var(--web-bg-muted)]">
            <Icon name="lucide:image" class="h-12 w-12 text-[var(--web-text-muted)]" />
          </div>
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6">
            <h3 class="text-xl font-semibold text-white">
              {{ item.title }}
            </h3>
          </div>
        </Motion>
      </Motion>
    </div>
  </div>
</template>
