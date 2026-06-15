<script setup lang="ts">
import { imageUrl, resolveImageAlt, type ImageValue } from "~/utils/image-value";

// Единая точка вывода картинок на сайте. Включён imgproxy (IMG_PROXY_ENABLED) —
// рендерим <NuxtImg> через провайдер imgproxy (ресайз + WebP/AVIF, srcset).
// Выключен — нативный <img> с оригиналом из S3 (без обработки).
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    src: ImageValue;
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

const url = computed(() => imageUrl(props.src));
const central = useImageAlt(url);
const resolvedAlt = computed(() => resolveImageAlt(props.src, central.value, props.alt));
</script>

<template>
  <NuxtImg
    v-if="enabled"
    provider="imgproxy"
    :src="url"
    :alt="resolvedAlt"
    :width="props.width"
    :height="props.height"
    :sizes="props.sizes"
    :fit="props.fit"
    :quality="props.quality"
    :loading="props.loading"
    :preload="props.preload"
    decoding="async"
    v-bind="$attrs"
  />
  <img
    v-else
    :src="url"
    :alt="resolvedAlt"
    :width="props.width"
    :height="props.height"
    :loading="props.loading"
    decoding="async"
    v-bind="$attrs"
  />
</template>
