<script setup lang="ts">
defineProps<{
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}>();
</script>

<template>
  <Separator
    :orientation="orientation"
    :decorative="decorative"
    :class="[
      'bg-[var(--web-border)]',
      (orientation ?? 'horizontal') === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
    ]"
    v-bind="$attrs"
  />
</template>
