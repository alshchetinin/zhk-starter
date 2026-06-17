<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { orpc } = useOrpc();
const { data, isPending, error, suspense } = useQuery(
  orpc.public.homepage.get.queryOptions(),
);

onServerPrefetch(suspense);

usePageSeo({
  title: () => data.value?.metaTitle,
  description: () => data.value?.metaDescription,
  ogImage: () => data.value?.ogImage,
});

useBreadcrumbs(() => ({ current: "Главная", isHome: true }));
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
    <div v-else class="section container-web text-center text-[var(--web-text-muted)]">
      <p>Главная страница ещё не настроена</p>
    </div>
  </div>
</template>
