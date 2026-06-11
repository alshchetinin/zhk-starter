<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string;
    title?: string;
    description?: string;
    compact?: boolean;
  }>(),
  { icon: "i-solar-inbox-linear", compact: false },
);
</script>

<template>
  <div
    class="flex flex-col items-center justify-center text-center"
    :class="compact ? 'py-8 px-4' : 'py-16 px-6'"
  >
    <div
      class="flex items-center justify-center rounded-xl bg-(--ui-bg-elevated) mb-3"
      :class="compact ? 'size-10' : 'size-12'"
    >
      <UIcon
        :name="icon"
        class="text-(--ui-text-dimmed)"
        :class="compact ? 'size-5' : 'size-6'"
      />
    </div>
    <p
      v-if="title"
      class="font-medium text-(--ui-text)"
      :class="compact ? 'text-sm' : 'text-base'"
    >
      {{ title }}
    </p>
    <p
      v-if="description"
      class="mt-1 text-xs text-(--ui-text-dimmed) max-w-md"
    >
      {{ description }}
    </p>
    <div v-if="$slots.actions" class="mt-4 flex items-center gap-1.5">
      <slot name="actions" />
    </div>
  </div>
</template>
