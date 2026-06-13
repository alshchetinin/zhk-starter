<script setup lang="ts">
const route = useRoute();
await navigateTo(`/sites/${route.params.id}/settings`, { replace: true });
</script>

<template>
  <div />
</template>
