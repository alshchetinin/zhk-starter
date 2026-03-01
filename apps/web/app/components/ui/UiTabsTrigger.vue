<script setup lang="ts">
defineProps<{
  value: string;
  disabled?: boolean;
  pill?: boolean;
}>();
</script>

<template>
  <TabsTrigger
    :value="value"
    :disabled="disabled"
    :class="[
      'px-5 py-2.5 text-sm font-medium transition-colors',
      'text-[var(--web-text-secondary)]',
      'data-[state=active]:bg-[var(--web-accent)] data-[state=active]:text-[var(--web-text-inverse)]',
      'data-[state=inactive]:hover:bg-[var(--web-bg-subtle)]',
      'data-[state=active]:hover:bg-[var(--web-accent-hover)]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--web-accent)]',
      'disabled:pointer-events-none disabled:opacity-50',
      pill ? 'rounded-full' : 'rounded-lg',
    ]"
    v-bind="$attrs"
  >
    <slot />
  </TabsTrigger>
</template>
