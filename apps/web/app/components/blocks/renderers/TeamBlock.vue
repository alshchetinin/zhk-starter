<script setup lang="ts">
defineProps<{
  items: Array<{ name: string; picture: string }>;
}>();

const { staggerContainer, staggerChild } = useMotionPresets();
</script>

<template>
  <div class="section">
    <div class="container-web">
      <Motion
        as="div"
        :variants="staggerContainer"
        initial="hidden"
        whileInView="show"
        :inViewOptions="{ once: true }"
        class="grid grid-cols-2 gap-6 md:grid-cols-4"
      >
        <Motion
          as="div"
          v-for="(member, i) in items"
          :key="i"
          :variants="staggerChild"
          class="text-center"
        >
          <img
            :src="member.picture"
            :alt="member.name"
            loading="lazy"
            class="aspect-square w-full rounded-full object-cover"
          />
          <p class="mt-3 text-sm font-medium">{{ member.name }}</p>
        </Motion>
      </Motion>
    </div>
  </div>
</template>
