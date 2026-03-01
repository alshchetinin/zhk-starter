<script setup lang="ts">
defineProps<{
  items: Array<{ name: string; picture: string }>;
}>();
</script>

<template>
  <div class="section">
    <div class="container-web">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div v-for="(member, i) in items" :key="i" class="text-center">
          <img
            :src="member.picture"
            :alt="member.name"
            loading="lazy"
            class="w-full rounded-full aspect-square object-cover"
          >
          <p class="mt-3 text-sm font-medium">{{ member.name }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
