<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  vacancies: Array<{ title: string; location: string; company: string; url?: string }>;
}>();

const { fadeUp, staggerContainer, staggerChild } = useMotionPresets();
</script>

<template>
  <div class="section">
    <div class="container-web">
      <!-- Header -->
      <Motion as="div" v-bind="fadeUp" class="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10">
        <div class="max-w-2xl">
          <h2 class="text-3xl md:text-4xl font-bold text-[var(--web-text-primary)] mb-4">
            {{ title }}
          </h2>
          <p v-if="description" class="text-[var(--web-text-secondary)] text-lg leading-relaxed">
            {{ description }}
          </p>
        </div>
        <a
          v-if="buttonLabel && buttonUrl"
          :href="buttonUrl"
          class="flex-shrink-0"
        >
          <UiButton variant="primary" size="lg">
            {{ buttonLabel }}
          </UiButton>
        </a>
      </Motion>

      <!-- Vacancies grid -->
      <Motion
        as="div"
        :variants="staggerContainer"
        initial="hidden"
        whileInView="show"
        :inViewOptions="{ once: true }"
        class="grid gap-4 md:grid-cols-2"
      >
        <Motion
          as="div"
          v-for="(vacancy, i) in vacancies"
          :key="i"
          :variants="staggerChild"
        >
          <div class="flex flex-col justify-between h-full rounded-[var(--radius-xl)] bg-[var(--web-bg-muted)] p-6 md:p-8">
            <div>
              <h3 class="text-xl font-semibold text-[var(--web-text-primary)] mb-3">
                {{ vacancy.title }}
              </h3>
              <div class="flex items-center gap-3 text-sm text-[var(--web-text-secondary)]">
                <span>{{ vacancy.location }}</span>
                <span class="w-1 h-1 rounded-full bg-[var(--web-text-muted)]" />
                <span>{{ vacancy.company }}</span>
              </div>
            </div>
            <div class="mt-8">
              <a v-if="vacancy.url" :href="vacancy.url">
                <UiButton variant="outline" size="sm">
                  Подробнее
                </UiButton>
              </a>
            </div>
          </div>
        </Motion>
      </Motion>
    </div>
  </div>
</template>
