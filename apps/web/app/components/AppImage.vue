<script setup lang="ts">
// Единая точка вывода картинок на сайте. Включён imgproxy (IMG_PROXY_ENABLED) —
// рендерим <NuxtImg> через провайдер imgproxy (ресайз + WebP/AVIF, srcset).
// Выключен — нативный <img> с оригиналом из S3 (без обработки).
defineOptions({ inheritAttrs: false });

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
const enabled = computed(() => config.public.imgProxy.enabled);
</script>

<template>
  <NuxtImg
    v-if="enabled"
    provider="imgproxy"
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
    v-bind="$attrs"
  />
  <img
    v-else
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :loading="loading"
    decoding="async"
    v-bind="$attrs"
  />
</template>
