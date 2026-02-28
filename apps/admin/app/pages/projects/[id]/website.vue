<script setup lang="ts">
defineProps<{
  project: any;
}>();
</script>

<template>
  <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-12 text-center">
    <UIcon name="i-tabler-world" class="mx-auto size-12 text-(--ui-text-muted)" />
    <h3 class="mt-4 text-lg font-semibold">Информация на сайте</h3>
    <p class="mt-2 text-sm text-(--ui-text-muted)">
      Раздел в разработке. Здесь будет управление контентом проекта на сайте.
    </p>
  </div>
</template>
