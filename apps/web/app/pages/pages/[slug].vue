<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const route = useRoute();
const { orpc } = useOrpc();
const { data, isPending, error, suspense } = useQuery(orpc.public.pages.getBySlug.queryOptions({ input: { slug: route.params.slug as string } }));

onServerPrefetch(suspense);
</script>

<template>
  <div>
    <h1>Page Detail</h1>
    <p v-if="isPending">Loading...</p>
    <p v-else-if="error">Error: {{ error.message }}</p>
    <pre v-else>{{ JSON.stringify(data, null, 2) }}</pre>
  </div>
</template>
