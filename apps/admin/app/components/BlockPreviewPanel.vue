<script setup lang="ts">
import type { ContentBlock } from "@zhk/api/shared/blocks";

const props = defineProps<{
  blocks: ContentBlock[];
}>();

const { viewport, iframeRef, iframeReady, previewUrl, sendBlocks, reloadPreview } = useBlockPreview();

const viewportSizes: Record<typeof viewport.value, { w: string; h: string }> = {
  desktop: { w: "100%", h: "100%" },
  tablet: { w: "768px", h: "1024px" },
  mobile: { w: "390px", h: "844px" },
};

watch(
  () => props.blocks,
  (v) => {
    if (iframeReady.value) sendBlocks(v);
  },
  { deep: true, immediate: false },
);

watch(iframeReady, (ready) => {
  if (ready) sendBlocks(props.blocks);
});

const frameStyle = computed(() => ({
  width: viewportSizes[viewport.value].w,
  height: viewportSizes[viewport.value].h,
  maxWidth: "100%",
  maxHeight: "100%",
  transition: "width 0.25s, height 0.25s",
}));
</script>

<template>
  <div class="flex flex-col h-full bg-(--ui-bg-muted) rounded-lg border border-(--ui-border)">
    <div class="flex items-center justify-between px-3 py-2 border-b border-(--ui-border)">
      <div class="flex gap-1">
        <UButton
          v-for="v in (['desktop', 'tablet', 'mobile'] as const)"
          :key="v"
          size="xs"
          :variant="viewport === v ? 'solid' : 'ghost'"
          :icon="v === 'desktop' ? 'i-solar-monitor-linear' : v === 'tablet' ? 'i-solar-tablet-linear' : 'i-solar-smartphone-linear'"
          @click="viewport = v"
        />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-(--ui-text-muted) truncate max-w-xs">{{ previewUrl }}</span>
        <UButton size="xs" variant="ghost" icon="i-solar-refresh-linear" @click="reloadPreview" />
      </div>
    </div>
    <div class="flex-1 flex items-start justify-center overflow-auto p-4">
      <iframe
        ref="iframeRef"
        :src="previewUrl"
        :style="frameStyle"
        class="bg-white rounded shadow-md border border-(--ui-border)"
      />
    </div>
  </div>
</template>
