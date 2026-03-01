<script setup lang="ts">
const modelValue = defineModel<string>();

defineProps<{
  defaultValue?: string;
  orientation?: "horizontal" | "vertical";
}>();
</script>

<template>
  <TabsRoot
    v-model="modelValue"
    :default-value="defaultValue"
    :orientation="orientation"
    v-bind="$attrs"
  >
    <slot />
  </TabsRoot>
</template>
