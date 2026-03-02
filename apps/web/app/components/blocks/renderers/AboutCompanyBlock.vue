<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  image: string | null;
  stats: Array<{ value: string; label: string }>;
}>();

const { fadeUp, fadeRight, staggerContainer, staggerChild } = useMotionPresets();
</script>

<template>
  <div class="section">
    <div class="container-web">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <!-- Left: text + stats -->
        <Motion as="div" v-bind="fadeUp">
          <h2 class="text-3xl md:text-4xl font-bold text-[var(--web-text-primary)] mb-6">
            {{ title }}
          </h2>

          <p
            v-if="description"
            class="text-[var(--web-text-secondary)] text-lg leading-relaxed mb-6"
          >
            {{ description }}
          </p>

          <a
            v-if="buttonLabel && buttonUrl"
            :href="buttonUrl"
            class="inline-block text-[var(--web-text-primary)] font-medium underline underline-offset-4 hover:text-[var(--web-accent)] transition-colors mb-10"
          >
            {{ buttonLabel }}
          </a>

          <!-- Stats grid -->
          <Motion
            as="div"
            :variants="staggerContainer"
            initial="hidden"
            whileInView="show"
            :inViewOptions="{ once: true }"
            class="grid grid-cols-2 gap-4"
          >
            <Motion
              as="div"
              v-for="(stat, i) in stats"
              :key="i"
              :variants="staggerChild"
              class="rounded-[var(--radius-xl)] bg-[var(--web-bg-muted)] p-5"
            >
              <div class="text-2xl md:text-3xl font-bold text-[var(--web-text-primary)] mb-1">
                {{ stat.value }}
              </div>
              <div class="text-sm text-[var(--web-text-secondary)]">
                {{ stat.label }}
              </div>
            </Motion>
          </Motion>
        </Motion>

        <!-- Right: image -->
        <Motion as="div" v-bind="fadeRight">
          <div class="aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)]">
            <img
              v-if="image"
              :src="image"
              :alt="title"
              class="h-full w-full object-cover"
              loading="lazy"
            />
            <div
              v-else
              class="h-full w-full bg-[var(--web-bg-muted)] flex items-center justify-center"
            >
              <Icon name="lucide:image" class="size-16 text-[var(--web-text-muted)]" />
            </div>
          </div>
        </Motion>
      </div>
    </div>
  </div>
</template>
