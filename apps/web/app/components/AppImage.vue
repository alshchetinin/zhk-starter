<script setup lang="ts">
withDefaults(
  defineProps<{
    src: string;
    alt: string;
    width?: number | string;
    height?: number | string;
    sizes?: string;
    fit?: string;
    quality?: number;
    loading?: "lazy" | "eager";
    preload?: boolean;
  }>(),
  {
    fit: "cover",
    quality: 80,
    loading: "lazy",
  },
);

const config = useRuntimeConfig();
const provider = computed(() => (config.public.imgProxy.enabled ? "imgproxy" : "none"));
</script>

<template>
  <NuxtImg
    :provider="provider"
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :sizes="sizes"
    :fit="fit"
    :quality="quality"
    :loading="loading"
    :preload="preload"
    decoding="async"
  />
</template>
