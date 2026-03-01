<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const route = useRoute();
const { orpc } = useOrpc();
const { data, isPending, error, suspense } = useQuery(orpc.public.pages.getBySlug.queryOptions({ input: { slug: route.params.slug as string } }));

onServerPrefetch(suspense);
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
