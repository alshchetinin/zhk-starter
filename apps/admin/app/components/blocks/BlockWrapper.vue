<script setup lang="ts">
import { blockDefinitions } from "@zhk/api/shared/blocks";
import type { BlockType } from "@zhk/api/shared/blocks";

const props = defineProps<{
  type: BlockType;
  index: number;
  total: number;
  defaultOpen?: boolean;
}>();

const emit = defineEmits<{
  remove: [];
  moveUp: [];
  moveDown: [];
}>();

const isOpen = ref(props.defaultOpen ?? false);
const showRemoveConfirm = ref(false);

function confirmRemove() {
  showRemoveConfirm.value = false;
  emit('remove');
}

const definition = computed(() =>
  blockDefinitions.find((d) => d.type === props.type),
);
</script>

<template>
  <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg)">
    <div
      class="flex items-center gap-2 px-4 py-2 bg-(--ui-bg-elevated) rounded-t-lg cursor-pointer select-none"
      :class="{ 'border-b border-(--ui-border)': isOpen }"
      @click="isOpen = !isOpen"
    >
      <UIcon
        name="i-tabler-chevron-right"
        class="size-4 text-(--ui-text-muted) transition-transform duration-200"
        :class="{ 'rotate-90': isOpen }"
      />
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
        @click.stop="$emit('moveUp')"
      />
      <UButton
        variant="ghost"
        size="xs"
        icon="i-tabler-arrow-down"
        :disabled="index === total - 1"
        @click.stop="$emit('moveDown')"
      />
      <UButton
        variant="ghost"
        size="xs"
        icon="i-tabler-trash"
        color="error"
        @click.stop="showRemoveConfirm = true"
      />
    </div>

    <UModal v-if="showRemoveConfirm" v-model:open="showRemoveConfirm" title="Удалить блок?">
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">
          Блок «{{ definition?.label ?? type }}» будет удалён. Это действие нельзя отменить.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="showRemoveConfirm = false">
            Отмена
          </UButton>
          <UButton color="error" @click="confirmRemove">
            Удалить
          </UButton>
        </div>
      </template>
    </UModal>
    <UCollapsible v-model:open="isOpen" :unmount-on-hide="false">
      <template #content>
        <div class="p-4">
          <slot />
        </div>
      </template>
    </UCollapsible>
  </div>
</template>
