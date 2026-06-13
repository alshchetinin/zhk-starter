<script setup lang="ts">
const props = defineProps<{
  title: string;
  description?: string;
  tabs: Array<{ label: string; title: string; description?: string; images: string[] }>;
}>();

const { fadeUp, fade } = useMotionPresets();

const activeTab = ref(props.tabs[0]?.label ?? '');
const activeTabData = computed(() => props.tabs.find(t => t.label === activeTab.value) ?? props.tabs[0]);
const currentSlide = ref(0);

watch(activeTab, () => {
  currentSlide.value = 0;
});

const totalSlides = computed(() => activeTabData.value?.images.length ?? 0);

function prev() {
  currentSlide.value = (currentSlide.value - 1 + totalSlides.value) % totalSlides.value;
}
function next() {
  currentSlide.value = (currentSlide.value + 1) % totalSlides.value;
}
</script>

<template>
  <div class="section">
    <div class="container-web">
      <Motion as="div" v-bind="fadeUp">
        <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-xl">
            <h2 class="text-3xl font-bold tracking-tight text-[var(--web-text-primary)] md:text-4xl lg:text-5xl">
              {{ title }}
            </h2>
            <p v-if="description" class="mt-4 text-lg text-[var(--web-text-secondary)]">
              {{ description }}
            </p>
          </div>

          <UiTabs v-model="activeTab" class="shrink-0">
            <UiTabsList>
              <UiTabsTrigger
                v-for="tab in tabs"
                :key="tab.label"
                :value="tab.label"
                pill
              >
                {{ tab.label }}
              </UiTabsTrigger>
            </UiTabsList>
          </UiTabs>
        </div>
      </Motion>

      <Motion as="div" v-bind="fadeUp" class="mt-8">
        <div class="relative overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--web-bg-muted)]">
          <div class="relative aspect-[16/9] w-full">
            <Transition name="fade" mode="out-in">
              <AppImage
                :key="`${activeTab}-${currentSlide}`"
                :src="activeTabData.images[currentSlide]"
                :alt="activeTabData.title"
                :width="1280"
                sizes="sm:100vw lg:66vw"
                class="absolute inset-0 size-full object-cover"
              />
            </Transition>
          </div>

          <button
            v-if="totalSlides > 1"
            class="absolute left-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--web-text-primary)] shadow-sm backdrop-blur-sm transition hover:bg-white"
            @click="prev"
          >
            <Icon name="lucide:arrow-left" class="size-5" />
          </button>
          <button
            v-if="totalSlides > 1"
            class="absolute right-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--web-text-primary)] shadow-sm backdrop-blur-sm transition hover:bg-white"
            @click="next"
          >
            <Icon name="lucide:arrow-right" class="size-5" />
          </button>

          <div class="p-6 md:p-8">
            <h3 class="text-2xl font-semibold text-[var(--web-text-primary)] md:text-3xl">
              {{ activeTabData.title }}
            </h3>
            <p v-if="activeTabData.description" class="mt-3 max-w-2xl text-[var(--web-text-secondary)]">
              {{ activeTabData.description }}
            </p>
          </div>
        </div>
      </Motion>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
