<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const route = useRoute();
const { orpc } = useOrpc();
const { data, isPending, error, suspense } = useQuery(orpc.public.projects.getById.queryOptions({ input: { id: route.params.id as string } }));

onServerPrefetch(suspense);

usePageSeo({
  title: () => data.value?.name,
  ogImage: () => data.value?.imageUrl,
});

const url = useRequestURL();

useJsonLd(() => {
  if (!data.value) return null;
  return buildApartmentComplexJsonLd({
    name: data.value.name,
    url: `${url.origin}${route.path}`,
    address: data.value.address,
    coordinates: data.value.coordinates,
    images: [data.value.imageUrl, ...(data.value.gallery ?? [])],
  });
});

useBreadcrumbs(() => ({
  current: data.value?.name ?? "",
  parent: { label: "Проекты", href: "/projects" },
  config: data.value?.breadcrumbs,
}));
</script>

<template>
  <div>
    <h1>Project Detail</h1>
    <NuxtLink to="/projects">&larr; Back</NuxtLink>
    <p v-if="isPending">Loading...</p>
    <p v-else-if="error">Error: {{ error.message }}</p>
    <pre v-else>{{ JSON.stringify(data, null, 2) }}</pre>
  </div>
</template>
