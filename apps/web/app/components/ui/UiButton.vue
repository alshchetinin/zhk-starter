<script setup lang="ts">
import { cn } from "./utils";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
    icon?: boolean;
    as?: string | object;
    asChild?: boolean;
    disabled?: boolean;
  }>(),
  {
    variant: "primary",
    size: "md",
    as: "button",
    icon: false,
    disabled: false,
  },
);

const variantClass: Record<string, string> = {
  primary:
    "bg-[var(--web-accent)] text-[var(--web-text-inverse)] hover:bg-[var(--web-accent-hover)]",
  secondary:
    "border border-[var(--web-border)] text-[var(--web-text-primary)] hover:bg-[var(--web-bg-muted)]",
  ghost:
    "text-[var(--web-text-secondary)] hover:bg-[var(--web-bg-muted)] hover:text-[var(--web-text-primary)]",
  outline:
    "border border-[var(--web-border)] text-[var(--web-text-primary)] hover:border-[var(--web-border-hover)]",
};

const sizeClass: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-md",
  md: "px-5 py-2.5 text-sm gap-2 rounded-lg",
  lg: "px-6 py-3 text-sm gap-2 rounded-lg",
};

const iconSizeClass: Record<string, string> = {
  sm: "size-8 rounded-md",
  md: "size-10 rounded-lg",
  lg: "size-12 rounded-lg",
};

const classes = computed(() =>
  cn(
    "inline-flex items-center justify-center font-medium transition-[colors,transform] duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--web-accent)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98] hover:scale-[1.02]",
    variantClass[props.variant],
    props.icon ? iconSizeClass[props.size] : sizeClass[props.size],
  ),
);
</script>

<template>
  <Primitive :as="as" :as-child="asChild" :disabled="disabled" :class="classes" v-bind="$attrs">
    <slot name="icon-left" />
    <slot />
    <slot name="icon-right" />
  </Primitive>
</template>
