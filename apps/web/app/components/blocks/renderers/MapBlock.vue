<script setup lang="ts">
defineProps<{
  name: string;
}>();
</script>

<template>
  <div class="section">
    <div class="container-web">
      <!-- TODO: реализовать рендеринг блока "Карта" -->
      <pre class="rounded-xl bg-[var(--web-bg-muted)] p-6 text-sm overflow-x-auto">{{ $props }}</pre>
    </div>
  </div>
</template>
