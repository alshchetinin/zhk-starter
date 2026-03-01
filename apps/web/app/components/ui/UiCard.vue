<script setup lang="ts">
import { cn } from "./utils";

const props = withDefaults(
  defineProps<{
    as?: string | object;
    padded?: boolean;
    hoverable?: boolean;
  }>(),
  {
    as: "div",
    padded: true,
    hoverable: false,
  },
);

const classes = computed(() =>
  cn(
    "overflow-hidden rounded-xl border border-[var(--web-border)] bg-[var(--web-bg)]",
    "transition-[box-shadow,transform] duration-200",
    props.hoverable && "hover:shadow-md hover:scale-[1.01]",
  ),
);
</script>

<template>
  <Primitive :as="as" :class="classes" v-bind="$attrs">
    <div v-if="$slots.header">
      <slot name="header" />
    </div>
    <div :class="padded ? 'p-5' : ''">
      <slot />
    </div>
    <div v-if="$slots.footer" class="border-t border-[var(--web-border)] p-5">
      <slot name="footer" />
    </div>
  </Primitive>
</template>
