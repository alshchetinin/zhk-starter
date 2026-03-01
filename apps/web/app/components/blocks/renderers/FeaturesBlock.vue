<script setup lang="ts">
defineProps<{
  name: string;
  picture: string;
}>();
</script>

<template>
  <div class="section">
    <div class="container-web flex flex-col items-center">
      <img
        :src="picture"
        :alt="name"
        class="w-full max-w-xs rounded-xl object-cover aspect-square"
      >
      <h3 class="mt-4 text-xl font-semibold text-center">{{ name }}</h3>
    </div>
  </div>
</template>
