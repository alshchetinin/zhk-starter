<script setup lang="ts">
const props = defineProps<{
  title: string;
  subtitle?: string;
  body: string;
  note?: string;
  content: string;
  sortOrder?: number;
  isVisible: boolean;
  link?: string;
  cover: string;
  gallery?: string[];
  size: "small" | "medium" | "large";
}>();

const sizeClass = computed(() => {
  const map = { small: "max-w-2xl", medium: "max-w-4xl", large: "" };
  return map[props.size] || "";
});
</script>

<template>
  <div v-if="isVisible" class="section">
    <div class="container-web" :class="sizeClass">
      <img
        v-if="cover"
        :src="cover"
        :alt="title"
        class="w-full rounded-xl object-cover aspect-[16/9] mb-8"
      >

      <h2 class="text-3xl md:text-4xl font-bold">{{ title }}</h2>

      <p v-if="subtitle" class="mt-2 text-lg text-[var(--web-text-secondary)]">
        {{ subtitle }}
      </p>

      <p class="mt-4 text-[var(--web-text-secondary)] whitespace-pre-line">{{ body }}</p>

      <div v-if="content" class="prose-web mt-6" v-html="content" />

      <aside
        v-if="note"
        class="mt-6 border-l-3 border-[var(--web-accent)] bg-[var(--web-bg-muted)] rounded-r-lg px-5 py-4 text-sm text-[var(--web-text-secondary)]"
      >
        {{ note }}
      </aside>

      <div v-if="gallery?.length" class="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
        <img
          v-for="(src, i) in gallery"
          :key="i"
          :src="src"
          :alt="`${title} — ${i + 1}`"
          :loading="i > 0 ? 'lazy' : undefined"
          class="w-full rounded-lg object-cover aspect-[4/3]"
        >
      </div>

      <a
        v-if="link"
        :href="link"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 mt-6 text-[var(--web-accent)] hover:text-[var(--web-accent-hover)] font-medium"
      >
        Подробнее
        <Icon name="lucide:external-link" class="size-4" />
      </a>
    </div>
  </div>
</template>
