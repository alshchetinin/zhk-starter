<script setup lang="ts">
defineProps<{
  tets: string;
}>();

const { fadeUp } = useMotionPresets();
</script>

<template>
  <div class="section">
    <div class="container-web">
      <Motion as="div" v-bind="fadeUp">
        <!-- TODO: реализовать рендеринг блока "Тестовый" -->
        <pre class="rounded-xl bg-[var(--web-bg-muted)] p-6 text-sm overflow-x-auto">{{ $props }}</pre>
      </Motion>
    </div>
  </div>
</template>
