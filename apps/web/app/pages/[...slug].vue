<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const route = useRoute();
const { orpc } = useOrpc();

const slug = computed(() => {
  const s = route.params.slug;
  return Array.isArray(s) ? s.join("/") : s;
});

const { data, isPending, error, suspense } = useQuery(
  computed(() =>
    orpc.public.pages.getBySlug.queryOptions({
      input: { slug: slug.value },
    }),
  ),
);

onServerPrefetch(suspense);

usePageSeo({
  title: () => data.value?.metaTitle || data.value?.title,
  description: () => data.value?.metaDescription,
  ogImage: () => data.value?.ogImage,
});

watch(
  [data, isPending],
  ([d, loading]) => {
    if (!loading && !d) {
      throw createError({ statusCode: 404, statusMessage: "Страница не найдена" });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div>
    <p v-if="isPending" class="section container-web text-center text-[var(--web-text-muted)]">
      Загрузка...
    </p>
    <p v-else-if="error" class="section container-web text-center text-[var(--web-text-muted)]">
      {{ error.message }}
    </p>
    <BlockRenderer v-else-if="data" :blocks="data.contentBlocks" />
  </div>
</template>
