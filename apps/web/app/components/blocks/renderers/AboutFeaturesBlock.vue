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
      <Motion as="div" v-bind="fadeUp" class="text-center">
        <h2 class="mx-auto max-w-4xl text-3xl font-bold tracking-tight text-[var(--web-text-primary)] md:text-4xl lg:text-5xl">
          {{ title }}
        </h2>
        <p v-if="description" class="mx-auto mt-6 max-w-2xl text-lg text-[var(--web-text-secondary)]">
          {{ description }}
        </p>
      </Motion>

      <Motion
        as="div"
        :variants="staggerContainer"
        initial="hidden"
        whileInView="show"
        :inViewOptions="{ once: true }"
        class="mt-12 grid gap-6 md:grid-cols-3"
      >
        <Motion
          as="div"
          v-for="(item, i) in items"
          :key="i"
          :variants="staggerChild"
        >
          <div class="group relative overflow-hidden rounded-[var(--radius-xl)]">
            <div class="aspect-[4/3]">
              <AppImage
                v-if="item.image"
                :src="item.image"
                :alt="item.title"
                :width="600"
                sizes="sm:100vw lg:33vw"
                :loading="i > 0 ? 'lazy' : 'eager'"
                class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div v-else class="size-full bg-[var(--web-bg-muted)]" />
            </div>
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 pt-16">
              <h3 class="text-xl font-semibold text-white md:text-2xl">
                {{ item.title }}
              </h3>
            </div>
          </div>
        </Motion>
      </Motion>
    </div>
  </div>
</template>
