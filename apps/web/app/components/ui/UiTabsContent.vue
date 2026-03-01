<script setup lang="ts">
defineProps<{
  value: string;
}>();
</script>

<template>
  <TabsContent :value="value" class="focus-visible:outline-none" v-bind="$attrs">
    <slot />
  </TabsContent>
</template>
