<script setup lang="ts">
const props = defineProps<{
  title: string;
  description?: string;
  images: string[];
  primaryButtonText: string;
  primaryButtonUrl: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
}>();

const currentSlide = ref(0);
const { fadeUp, hoverScale } = useMotionPresets();

function next() {
  currentSlide.value = (currentSlide.value + 1) % props.images.length;
}

function prev() {
  currentSlide.value = (currentSlide.value - 1 + props.images.length) % props.images.length;
}
</script>

<template>
  <div class="relative flex min-h-svh flex-col text-[var(--web-text-inverse)]">
    <!-- Background slideshow -->
    <div class="absolute inset-0 overflow-hidden">
      <img
        v-for="(img, i) in images"
        :key="img"
        :src="img"
        :alt="title"
        class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
        :class="i === currentSlide ? 'opacity-100' : 'opacity-0'"
        :loading="i > 0 ? 'lazy' : undefined"
        :fetchpriority="i === 0 ? 'high' : undefined"
      />
      <div class="absolute inset-0 bg-black/40" />
    </div>

    <!-- Slide arrows -->
    <template v-if="images.length > 1">
      <button
        class="absolute left-6 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm transition-colors hover:bg-white/20"
        @click="prev"
      >
        <Icon name="lucide:chevron-left" class="h-5 w-5" />
      </button>
      <button
        class="absolute right-6 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm transition-colors hover:bg-white/20"
        @click="next"
      >
        <Icon name="lucide:chevron-right" class="h-5 w-5" />
      </button>
    </template>

    <!-- Content -->
    <Motion as="div" v-bind="fadeUp" class="relative z-10 mt-auto px-6 pb-8 md:px-12 lg:px-20">
      <h1 class="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-4 max-w-xl text-lg text-white/80">
        {{ description }}
      </p>
    </Motion>

    <!-- Bottom bar -->
    <div class="relative z-10 border-t border-white/20 bg-white px-6 py-4 text-[var(--web-text-primary)] md:px-12 lg:px-20">
      <div class="flex flex-wrap items-center justify-end gap-4">
        <Motion
          v-if="secondaryButtonText && secondaryButtonUrl"
          as="a"
          v-bind="hoverScale"
          :href="secondaryButtonUrl"
          class="rounded-lg border border-[var(--web-border)] px-6 py-3 text-sm font-medium transition-colors hover:bg-[var(--web-bg-muted)]"
        >
          {{ secondaryButtonText }}
        </Motion>
        <Motion
          as="a"
          v-bind="hoverScale"
          :href="primaryButtonUrl"
          class="rounded-lg bg-[var(--web-accent)] px-6 py-3 text-sm font-medium text-[var(--web-text-inverse)] transition-colors hover:bg-[var(--web-accent-hover)]"
        >
          {{ primaryButtonText }}
        </Motion>
      </div>
    </div>
  </div>
</template>
