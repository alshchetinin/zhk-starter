<script setup lang="ts">
type Variant = "ghost" | "primary" | "subtle";

withDefaults(
  defineProps<{
    icon?: string;
    iconRight?: string;
    to?: string;
    variant?: Variant;
    loading?: boolean;
    disabled?: boolean;
    title?: string;
  }>(),
  { variant: "ghost", loading: false, disabled: false },
);

defineEmits<{ click: [MouseEvent] }>();

const variantClass: Record<Variant, string> = {
  ghost:
    "border border-(--ui-border) text-(--ui-text-muted) hover:text-(--ui-text) hover:bg-(--ui-bg-elevated)",
  subtle:
    "text-(--ui-text-muted) hover:text-(--ui-text) hover:bg-(--ui-bg-elevated)",
  primary:
    "bg-(--ui-bg-inverted) text-(--ui-text-inverted) hover:opacity-90",
};
</script>

<template>
  <component
    :is="to ? 'NuxtLink' : 'button'"
    :to="to"
    :disabled="!to && (disabled || loading)"
    :title="title"
    class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition disabled:opacity-40 disabled:pointer-events-none"
    :class="variantClass[variant]"
    @click="(e: MouseEvent) => !to && $emit('click', e)"
  >
    <UIcon
      v-if="loading"
      name="i-tabler-loader-2"
      class="size-3.5 animate-spin"
    />
    <UIcon v-else-if="icon" :name="icon" class="size-3.5" />
    <slot />
    <UIcon v-if="iconRight && !loading" :name="iconRight" class="size-3.5" />
  </component>
</template>
