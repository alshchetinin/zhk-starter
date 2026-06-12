<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const route = useRoute();
const { orpc } = useOrpc();
const { data, isPending, error, suspense } = useQuery(orpc.public.news.getBySlug.queryOptions({ input: { slug: route.params.slug as string } }));

onServerPrefetch(suspense);

usePageSeo({
  title: () => data.value?.metaTitle || data.value?.title,
  description: () => data.value?.metaDescription || data.value?.excerpt,
  ogImage: () => data.value?.ogImage,
  type: "article",
});

const gate = useSiteGate();
const url = useRequestURL();

useJsonLd(() => {
  if (!data.value) return null;
  return buildNewsArticleJsonLd({
    headline: data.value.title,
    url: `${url.origin}${route.path}`,
    description: data.value.metaDescription || data.value.excerpt,
    image: absolutizeUrl(data.value.ogImage, url.origin),
    datePublished: data.value.publishedAt
      ? new Date(data.value.publishedAt).toISOString()
      : null,
    dateModified: data.value.updatedAt
      ? new Date(data.value.updatedAt).toISOString()
      : null,
    publisherName: gate.value?.seo?.organization.name ?? gate.value?.name,
    publisherLogo: gate.value?.seo?.organization.logo,
  });
});

useJsonLd(() =>
  data.value
    ? buildBreadcrumbJsonLd([
        { name: "Главная", url: `${url.origin}/` },
        { name: "Новости", url: `${url.origin}/news` },
        { name: data.value.title, url: `${url.origin}${route.path}` },
      ])
    : null,
);

const formattedDate = computed(() => {
  if (!data.value?.publishedAt) return "";
  return new Date(data.value.publishedAt).toLocaleDateString("ru-RU");
});
</script>

<template>
  <div>
    <div class="section container-web">
      <NuxtLink
        to="/news"
        class="inline-flex items-center gap-1 text-sm text-[var(--web-text-secondary)] hover:text-[var(--web-text-primary)]"
      >
        <Icon name="lucide:arrow-left" class="size-4" />
        Назад к новостям
      </NuxtLink>
    </div>

    <p v-if="isPending" class="container-web text-center text-[var(--web-text-muted)]">
      Загрузка...
    </p>
    <p v-else-if="error" class="container-web text-center text-[var(--web-text-muted)]">
      {{ error.message }}
    </p>
    <template v-else-if="data">
      <header class="container-web mb-8">
        <h1 class="text-3xl md:text-4xl font-bold">{{ data.title }}</h1>
        <p v-if="formattedDate" class="mt-2 text-sm text-[var(--web-text-muted)]">
          {{ formattedDate }}
        </p>
      </header>

      <BlockRenderer :blocks="data.contentBlocks" />
    </template>
  </div>
</template>
