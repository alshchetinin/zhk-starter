<script setup lang="ts">
const props = defineProps<{
  title: string;
  description?: string;
  tabs: Array<{ label: string; image: string | null; subtitle: string; text?: string }>;
}>();

const activeTab = ref(0);
const activeItem = computed(() => props.tabs[activeTab.value]);
const { fadeUp, scaleIn, hoverScale } = useMotionPresets();
</script>

<template>
  <div class="section">
    <div class="container-web">
      <!-- Header -->
      <Motion as="div" v-bind="fadeUp" class="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div class="max-w-xl">
          <h2 class="text-3xl font-bold tracking-tight text-[var(--web-text-primary)] md:text-4xl">
            {{ title }}
          </h2>
          <p v-if="description" class="mt-4 text-[var(--web-text-secondary)]">
            {{ description }}
          </p>
        </div>

        <!-- Tabs -->
        <div class="flex flex-wrap gap-2">
          <Motion
            as="button"
            v-for="(tab, i) in tabs"
            :key="i"
            v-bind="hoverScale"
            class="rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
            :class="i === activeTab
              ? 'bg-[var(--web-accent)] text-[var(--web-text-inverse)]'
              : 'bg-[var(--web-bg-muted)] text-[var(--web-text-secondary)] hover:bg-[var(--web-bg-subtle)]'"
            @click="activeTab = i"
          >
            {{ tab.label }}
          </Motion>
        </div>
      </Motion>

      <!-- Tab content -->
      <Motion as="div" v-if="activeItem" v-bind="scaleIn" :key="activeTab" class="mt-8">
        <div class="relative overflow-hidden rounded-2xl bg-[var(--web-bg-muted)]">
          <img
            v-if="activeItem.image"
            :src="activeItem.image"
            :alt="activeItem.subtitle"
            class="aspect-[16/9] w-full object-cover"
          />
          <div v-else class="flex aspect-[16/9] items-center justify-center">
            <Icon name="lucide:image" class="h-16 w-16 text-[var(--web-text-muted)]" />
          </div>

          <!-- Overlay text -->
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white md:p-10">
            <h3 class="text-2xl font-bold md:text-3xl">
              {{ activeItem.subtitle }}
            </h3>
            <p v-if="activeItem.text" class="mt-3 max-w-2xl text-white/80">
              {{ activeItem.text }}
            </p>
          </div>
        </div>
      </Motion>
    </div>
  </div>
</template>
