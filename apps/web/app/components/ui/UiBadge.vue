<script setup lang="ts">
import { cn } from "./utils";

const props = withDefaults(
  defineProps<{
    variant?: "default" | "accent" | "success" | "warning" | "error";
    size?: "sm" | "md";
  }>(),
  {
    variant: "default",
    size: "md",
  },
);

const variantClass: Record<string, string> = {
  default: "bg-[var(--web-bg-subtle)] text-[var(--web-text-secondary)]",
  accent: "bg-[var(--web-accent-light)] text-[var(--web-accent)]",
  success: "bg-[oklch(0.95_0.05_145)] text-[var(--color-success)]",
  warning: "bg-[oklch(0.95_0.05_75)] text-[var(--color-warning)]",
  error: "bg-[oklch(0.95_0.05_25)] text-[var(--color-error)]",
};

const sizeClass: Record<string, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
};

const classes = computed(() =>
  cn("inline-flex items-center font-medium rounded-full", variantClass[props.variant], sizeClass[props.size]),
);
</script>

<template>
  <span :class="classes" v-bind="$attrs">
    <slot />
  </span>
</template>
