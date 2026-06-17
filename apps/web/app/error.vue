<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();
const isNotFound = computed(() => props.error?.statusCode === 404);
const title = computed(() => (isNotFound.value ? "Сайт не найден" : "Что-то пошло не так"));
const message = computed(() =>
  isNotFound.value
    ? "По этому адресу нет активного сайта."
    : props.error?.statusMessage || "Произошла ошибка. Попробуйте позже.",
);
</script>

<template>
  <div class="min-h-svh flex flex-col items-center justify-center gap-3 p-6 text-center">
    <p class="text-5xl font-semibold" style="color: var(--web-text-primary)">
      {{ error?.statusCode || 500 }}
    </p>
    <h1 class="text-xl font-medium" style="color: var(--web-text-primary)">{{ title }}</h1>
    <p class="text-sm opacity-70" style="color: var(--web-text-primary)">{{ message }}</p>
  </div>
</template>
