<script setup lang="ts">
const open = defineModel<boolean>();
</script>

<template>
  <DialogRoot v-model:open="open">
    <slot />
  </DialogRoot>
</template>
