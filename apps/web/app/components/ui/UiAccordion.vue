<script setup lang="ts">
defineProps<{
  type?: "single" | "multiple";
  collapsible?: boolean;
  defaultValue?: string | string[];
}>();
</script>

<template>
  <AccordionRoot
    :type="type ?? 'single'"
    :collapsible="collapsible !== false"
    :default-value="defaultValue"
    class="divide-y divide-[var(--web-border)]"
    v-bind="$attrs"
  >
    <slot />
  </AccordionRoot>
</template>
