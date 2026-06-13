<script setup lang="ts">
defineProps<{
  title: string;
  member: Array<{ name: string; avatar: string | null }>;
}>();

const { fadeUp, staggerContainer, staggerChild } = useMotionPresets();
</script>

<template>
  <div class="section">
    <div class="container-web">
      <Motion as="div" v-bind="fadeUp">
        <!-- TODO: рендеринг полей: title -->
        <pre class="rounded-xl bg-[var(--web-bg-muted)] p-4 text-sm">{{ title }}</pre>
      </Motion>

      <Motion
        as="div"
        :variants="staggerContainer"
        initial="hidden"
        whileInView="show"
        :inViewOptions="{ once: true }"
        class="mt-8 grid gap-6 md:grid-cols-3"
      >
        <Motion
          as="div"
          v-for="(item, i) in member"
          :key="i"
          :variants="staggerChild"
        >
          <UiCard hoverable>
            <template #header>
              <AppImage v-if="item.avatar" :src="item.avatar" :alt="item.name" :width="400" sizes="sm:50vw md:25vw" :loading="i > 0 ? 'lazy' : 'eager'" class="aspect-[4/3] w-full object-cover" />
            </template>
            <!-- TODO: рендеринг содержимого карточки -->
            <pre class="text-sm">{{ item }}</pre>
          </UiCard>
        </Motion>
      </Motion>
    </div>
  </div>
</template>
