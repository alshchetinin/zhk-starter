<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const route = useRoute();
const { orpc } = useOrpc();
const { data, isPending, error, suspense } = useQuery(orpc.public.news.getBySlug.queryOptions({ input: { slug: route.params.slug as string } }));

onServerPrefetch(suspense);
</script>

<template>
  <div>
    <h1>News Detail</h1>
    <NuxtLink to="/news">&larr; Back</NuxtLink>
    <p v-if="isPending">Loading...</p>
    <p v-else-if="error">Error: {{ error.message }}</p>
    <pre v-else>{{ JSON.stringify(data, null, 2) }}</pre>
  </div>
</template>
