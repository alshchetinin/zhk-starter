<script setup lang="ts">
defineProps<{
  name: string;
  picture: string;
}>();

const { fadeUp } = useMotionPresets();
</script>

<template>
  <div class="section">
    <Motion as="div" v-bind="fadeUp" class="container-web flex flex-col items-center">
      <img
        :src="picture"
        :alt="name"
        class="aspect-square w-full max-w-xs rounded-xl object-cover"
      />
      <h3 class="mt-4 text-center text-xl font-semibold">{{ name }}</h3>
    </Motion>
  </div>
</template>
