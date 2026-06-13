<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  image: string | null;
  stats: Array<{ value: string; label: string }>;
}>();

const { fadeUp, fade, staggerContainer, staggerChild } = useMotionPresets();
</script>

<template>
  <div class="about">
    <!-- Image — first on mobile, sticky right on desktop -->
    <div class="about__image-col">
      <Motion as="div" v-bind="fade" class="h-full">
        <AppImage
          v-if="image"
          :src="image"
          :alt="title"
          :width="800"
          sizes="(max-width: 1024px) 100vw, 50vw"
          class="h-full w-full object-cover"
        />
        <div
          v-else
          class="h-full w-full bg-[var(--web-bg-muted)] flex items-center justify-center"
        >
          <Icon name="lucide:image" class="size-16 text-[var(--web-text-muted)]" />
        </div>
      </Motion>
    </div>

    <!-- Content — scrolls naturally -->
    <div class="about__content-col">
      <div class="about__content">
        <!-- Title -->
        <Motion as="div" v-bind="fadeUp" class="mb-6">
          <div class="about__accent" />
          <h2
            class="text-4xl md:text-5xl font-bold leading-[1.08] tracking-tight text-[var(--web-text-primary)]"
          >
            {{ title }}
          </h2>
        </Motion>

        <!-- Description -->
        <Motion
          v-if="description"
          as="p"
          v-bind="fadeUp"
          class="text-lg leading-relaxed text-[var(--web-text-secondary)] max-w-lg mb-8"
        >
          {{ description }}
        </Motion>

        <!-- Link -->
        <Motion v-if="buttonLabel && buttonUrl" as="div" v-bind="fadeUp" class="mb-14">
          <a
            :href="buttonUrl"
            class="group inline-flex items-center gap-2 text-[var(--web-text-primary)] font-medium hover:text-[var(--web-accent)] transition-colors"
          >
            {{ buttonLabel }}
            <Icon
              name="lucide:arrow-right"
              class="size-4 transition-transform group-hover:translate-x-1"
            />
          </a>
        </Motion>

        <!-- Stats -->
        <Motion
          v-if="stats.length"
          as="div"
          :variants="staggerContainer"
          initial="hidden"
          whileInView="show"
          :inViewOptions="{ once: true }"
          class="flex flex-col border-t border-[var(--web-border)]"
        >
          <Motion
            as="div"
            v-for="(stat, i) in stats"
            :key="i"
            :variants="staggerChild"
            class="py-6 border-b border-[var(--web-border)]"
          >
            <div class="text-lg font-semibold text-[var(--web-text-primary)] mb-1">
              {{ stat.value }}
            </div>
            <div class="text-sm leading-relaxed text-[var(--web-text-secondary)]">
              {{ stat.label }}
            </div>
          </Motion>
        </Motion>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about {
  display: flex;
  flex-direction: column;
}

/* ---- Image column ---- */
.about__image-col {
  aspect-ratio: 4 / 3;
  overflow: hidden;
}

/* ---- Content column ---- */
.about__content {
  padding-block: var(--spacing-section-sm);
  padding-inline: var(--web-container-padding);
}

/* ---- Accent line ---- */
.about__accent {
  width: 3rem;
  height: 2px;
  background: var(--web-accent);
  margin-bottom: 2rem;
}

/* ---- Desktop: side-by-side with sticky image ---- */
@media (min-width: 1024px) {
  .about {
    flex-direction: row;
  }

  .about__image-col {
    order: 2;
    width: 50%;
    flex-shrink: 0;
    position: sticky;
    top: var(--web-header-height, 0px);
    height: calc(100dvh - var(--web-header-height, 0px));
    aspect-ratio: auto;
  }

  .about__content-col {
    order: 1;
    width: 50%;
    min-width: 0;
  }

  .about__content {
    max-width: calc(var(--web-container-max) / 2);
    margin-left: auto;
    padding-block: var(--spacing-section);
    padding-right: 3.5rem;
  }
}
</style>
