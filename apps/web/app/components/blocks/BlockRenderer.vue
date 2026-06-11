<script setup lang="ts">
import type { ContentBlock } from "@zhk/api/shared/blocks";
import { normalizeBlockData } from "@zhk/api/shared/blocks";
import { blockRendererComponents } from "./renderers/index";
import FallbackBlock from "./renderers/FallbackBlock.vue";

defineProps<{
  blocks: ContentBlock[];
}>();

function getComponent(type: string) {
  return blockRendererComponents[type] ?? FallbackBlock;
}

function getProps(block: ContentBlock) {
  return blockRendererComponents[block.type]
    ? normalizeBlockData(block.type, block.data)
    : { ...block.data, blockType: block.type };
}
</script>

<template>
  <div>
    <section v-for="block in blocks" :key="block.id" :id="`block-${block.id}`">
      <component
        :is="getComponent(block.type)"
        v-bind="getProps(block)"
      />
    </section>
  </div>
</template>
