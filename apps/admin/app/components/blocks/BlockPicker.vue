<script setup lang="ts">
import { blockDefinitions } from "@zhk/api/shared/blocks";
import type { BlockType } from "@zhk/api/shared/blocks";

defineEmits<{
  select: [type: BlockType];
}>();

const open = ref(false);

const contentBlocks = computed(() =>
  blockDefinitions.filter(d => d.category !== "project"),
);
const projectBlocks = computed(() =>
  blockDefinitions.filter(d => d.category === "project"),
);

</script>

<template>
  <UPopover v-model:open="open">
    <UButton icon="i-tabler-plus" variant="outline" class="rounded-xl">
      Добавить блок
    </UButton>
    <template #content>
      <div class="p-2 space-y-1 w-64">
        <button
          v-for="def in contentBlocks"
          :key="def.type"
          class="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-(--ui-bg-elevated) transition-colors text-left"
          @click="
            $emit('select', def.type);
            open = false;
          "
        >
          <UIcon :name="def.icon" class="size-5 text-(--ui-text-muted)" />
          <div>
            <p class="text-sm font-medium">{{ def.label }}</p>
            <p class="text-xs text-(--ui-text-muted)">
              {{ def.description }}
            </p>
          </div>
        </button>

        <template v-if="projectBlocks.length">
          <div class="border-t border-(--ui-border) my-1 pt-1">
            <p class="text-xs text-(--ui-text-dimmed) px-3 py-1">Блоки проекта</p>
          </div>
          <button
            v-for="def in projectBlocks"
            :key="def.type"
            class="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-(--ui-bg-elevated) transition-colors text-left"
            @click="
              $emit('select', def.type);
              open = false;
            "
          >
            <UIcon :name="def.icon" class="size-5 text-(--ui-text-muted)" />
            <div>
              <p class="text-sm font-medium">{{ def.label }}</p>
              <p class="text-xs text-(--ui-text-muted)">
                {{ def.description }}
              </p>
            </div>
          </button>
        </template>
      </div>
    </template>
  </UPopover>
</template>
