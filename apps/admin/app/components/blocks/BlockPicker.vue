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

// Типы, у которых нет превью-PNG (img выдал ошибку) — показываем только иконку.
const withoutPreview = ref(new Set<string>());
function markBroken(type: string) {
  withoutPreview.value = new Set(withoutPreview.value).add(type);
}
</script>

<template>
  <UButton icon="i-solar-add-square-linear" variant="outline" @click="open = true">
    Добавить блок
  </UButton>

  <USlideover v-model:open="open" title="Добавить блок" side="right" :ui="{ content: 'sm:max-w-lg' }">
    <template #body>
      <div class="space-y-2">
        <button
          v-for="def in contentBlocks"
          :key="def.type"
          class="w-full rounded-lg border border-(--ui-border) hover:border-(--ui-border-accented) hover:bg-(--ui-bg-elevated) transition-colors text-left overflow-hidden"
          @click="
            $emit('select', def.type);
            open = false;
          "
        >
          <img
            v-if="!withoutPreview.has(def.type)"
            :src="`/block-previews/${def.type}.png`"
            alt=""
            loading="lazy"
            class="w-full aspect-[16/7] object-cover object-top border-b border-(--ui-border)"
            @error="markBroken(def.type)"
          />
          <div class="flex items-center gap-3 px-3 py-2.5">
            <UIcon :name="def.icon" class="size-5 shrink-0 text-(--ui-text-muted)" />
            <div>
              <p class="text-sm font-medium">{{ def.label }}</p>
              <p class="text-xs text-(--ui-text-muted)">
                {{ def.description }}
              </p>
            </div>
          </div>
        </button>

        <template v-if="projectBlocks.length">
          <div class="border-t border-(--ui-border) my-2 pt-2">
            <p class="text-xs text-(--ui-text-dimmed) px-3 py-1">Блоки проекта</p>
          </div>
          <button
            v-for="def in projectBlocks"
            :key="def.type"
            class="w-full rounded-lg border border-(--ui-border) hover:border-(--ui-border-accented) hover:bg-(--ui-bg-elevated) transition-colors text-left overflow-hidden"
            @click="
              $emit('select', def.type);
              open = false;
            "
          >
            <img
              v-if="!withoutPreview.has(def.type)"
              :src="`/block-previews/${def.type}.png`"
              alt=""
              loading="lazy"
              class="w-full aspect-[16/7] object-cover object-top border-b border-(--ui-border)"
              @error="markBroken(def.type)"
            />
            <div class="flex items-center gap-3 px-3 py-2.5">
              <UIcon :name="def.icon" class="size-5 shrink-0 text-(--ui-text-muted)" />
              <div>
                <p class="text-sm font-medium">{{ def.label }}</p>
                <p class="text-xs text-(--ui-text-muted)">
                  {{ def.description }}
                </p>
              </div>
            </div>
          </button>
        </template>
      </div>
    </template>
  </USlideover>
</template>
