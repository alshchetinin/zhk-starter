<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    flush?: boolean;
  }>(),
  { flush: false },
);
</script>

<template>
  <section
    class="rounded-xl border border-(--ui-border) bg-(--ui-bg) overflow-hidden"
  >
    <header
      v-if="title || $slots.header || $slots.actions"
      class="flex items-center justify-between gap-3 px-4 py-3 border-b border-(--ui-border)"
    >
      <div class="flex items-center gap-2 min-w-0">
        <slot name="header">
          <h2 class="text-sm font-semibold tracking-tight truncate">
            {{ title }}
          </h2>
        </slot>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-1.5 shrink-0">
        <slot name="actions" />
      </div>
    </header>
    <div :class="flush ? '' : 'p-4'">
      <slot />
    </div>
  </section>
</template>
