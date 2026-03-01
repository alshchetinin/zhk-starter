<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { orpc } = useOrpc();
const { data, isPending, error, suspense } = useQuery(orpc.public.promotions.list.queryOptions({ input: { page: 1, pageSize: 20 } }));

onServerPrefetch(suspense);
</script>

<template>
  <div>
    <h1>Promotions</h1>
    <p v-if="isPending">Loading...</p>
    <p v-else-if="error">Error: {{ error.message }}</p>
    <pre v-else>{{ JSON.stringify(data, null, 2) }}</pre>
  </div>
</template>
