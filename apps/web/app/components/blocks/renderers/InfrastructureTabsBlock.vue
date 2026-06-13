<script setup lang="ts">
const props = defineProps<{
  subtitle?: string;
  title: string;
  tabs: Array<{ label: string; title: string; description?: string; image: string | null }>;
}>();

const { fadeUp, fadeRight } = useMotionPresets();

const activeTab = ref(props.tabs[0]?.label ?? '');
const activeTabData = computed(() => props.tabs.find(t => t.label === activeTab.value) ?? props.tabs[0]);
</script>

<template>
  <div class="section bg-[var(--web-accent)] text-white">
    <div class="container-web">
      <div class="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <!-- Left: title + tab list -->
        <Motion as="div" v-bind="fadeUp">
          <span v-if="subtitle" class="text-sm font-medium uppercase tracking-wider text-white/60">
            {{ subtitle }}
          </span>
          <h2 class="mt-2 text-3xl font-bold md:text-4xl lg:text-5xl">
            {{ title }}
          </h2>

          <nav class="mt-10 flex flex-col gap-1">
            <button
              v-for="tab in tabs"
              :key="tab.label"
              class="rounded-[var(--radius-md)] px-4 py-3 text-left text-lg transition"
              :class="[
                activeTab === tab.label
                  ? 'bg-white/15 font-semibold text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80'
              ]"
              @click="activeTab = tab.label"
            >
              {{ tab.label }}
            </button>
          </nav>
        </Motion>

        <!-- Right: content -->
        <Motion as="div" v-bind="fadeRight" class="flex flex-col">
          <Transition name="tab-fade" mode="out-in">
            <div :key="activeTab" class="flex flex-1 flex-col">
              <div class="relative flex-1 overflow-hidden rounded-[var(--radius-xl)]">
                <AppImage
                  v-if="activeTabData.image"
                  :src="activeTabData.image"
                  :alt="activeTabData.title"
                  :width="800"
                  sizes="sm:100vw lg:50vw"
                  class="size-full min-h-80 object-cover"
                />
                <div v-else class="flex min-h-80 items-center justify-center bg-white/10">
                  <Icon name="lucide:image" class="size-12 text-white/30" />
                </div>
              </div>
              <div class="mt-6">
                <h3 class="text-xl font-semibold">{{ activeTabData.title }}</h3>
                <p v-if="activeTabData.description" class="mt-2 text-white/70">
                  {{ activeTabData.description }}
                </p>
              </div>
            </div>
          </Transition>
        </Motion>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.25s ease;
}
.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
}
</style>
