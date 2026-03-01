<script setup lang="ts">
import { blockDefinitions } from "@zhk/api/shared/blocks";
import type { BlockType } from "@zhk/api/shared/blocks";

const props = defineProps<{
  type: BlockType;
  index: number;
  total: number;
}>();

defineEmits<{
  remove: [];
  moveUp: [];
  moveDown: [];
}>();

const definition = computed(() =>
  blockDefinitions.find((d) => d.type === props.type),
);
</script>

<template>
  <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg)">
    <div
      class="flex items-center gap-2 px-4 py-2 border-b border-(--ui-border) bg-(--ui-bg-elevated) rounded-t-lg"
    >
      <UIcon
        :name="definition?.icon ?? 'i-tabler-puzzle'"
        class="size-4 text-(--ui-text-muted)"
      />
      <span class="text-sm font-medium flex-1">{{
        definition?.label ?? type
      }}</span>
      <UButton
        variant="ghost"
        size="xs"
        icon="i-tabler-arrow-up"
        :disabled="index === 0"
        @click="$emit('moveUp')"
      />
      <UButton
        variant="ghost"
        size="xs"
        icon="i-tabler-arrow-down"
        :disabled="index === total - 1"
        @click="$emit('moveDown')"
      />
      <UButton
        variant="ghost"
        size="xs"
        icon="i-tabler-trash"
        color="error"
        @click="$emit('remove')"
      />
    </div>
    <div class="p-4">
      <slot />
    </div>
  </div>
</template>
