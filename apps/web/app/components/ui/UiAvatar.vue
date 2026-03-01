<script setup lang="ts">
import { cn } from "./utils";

const props = withDefaults(
  defineProps<{
    src?: string;
    alt?: string;
    fallback?: string;
    size?: "sm" | "md" | "lg";
  }>(),
  {
    size: "md",
    fallback: "?",
  },
);

const sizeClass: Record<string, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
};
</script>

<template>
  <AvatarRoot
    :class="cn(
      'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--web-bg-subtle)]',
      sizeClass[size],
    )"
    v-bind="$attrs"
  >
    <AvatarImage v-if="src" :src="src" :alt="alt" class="size-full object-cover" />
    <AvatarFallback class="flex size-full items-center justify-center font-medium text-[var(--web-text-secondary)]">
      {{ fallback }}
    </AvatarFallback>
  </AvatarRoot>
</template>
