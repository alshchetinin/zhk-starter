<script setup lang="ts">
defineProps<{ siteName: string }>();
</script>

<template>
  <div
    class="min-h-svh flex flex-col items-center justify-center px-6 text-center"
    style="background: var(--web-bg-base, #fff); color: var(--web-text-primary, #111)"
  >
    <div class="max-w-md space-y-4">
      <div
        class="size-14 mx-auto rounded-2xl flex items-center justify-center"
        style="background: var(--web-bg-muted, #f4f4f5); color: var(--web-accent, #6366f1)"
      >
        <Icon name="lucide:sparkles" class="size-7" />
      </div>
      <h1 class="text-3xl font-semibold tracking-tight">Скоро открытие</h1>
      <p class="text-base opacity-70">
        Сайт <span class="font-medium">{{ siteName }}</span> готовится к запуску.
        Загляните чуть позже.
      </p>
    </div>
  </div>
</template>
