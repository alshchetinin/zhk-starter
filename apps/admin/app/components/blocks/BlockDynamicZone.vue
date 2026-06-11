<script setup lang="ts">
import { type ContentBlock, type BlockType, getBlockDefaultData, normalizeBlockData } from "@zhk/api/shared/blocks";
import { blockEditorComponents } from "./editors/index";

const model = defineModel<ContentBlock[]>({ default: () => [] });

const lastAddedId = ref<string | null>(null);

function addBlock(type: BlockType) {
  const id = crypto.randomUUID();
  const newBlock = {
    id,
    type,
    data: getBlockDefaultData(type),
  } as ContentBlock;
  lastAddedId.value = id;
  model.value = [...model.value, newBlock];
}

function removeBlock(index: number) {
  model.value = model.value.filter((_, i) => i !== index);
}

function moveBlock(from: number, direction: -1 | 1) {
  const to = from + direction;
  if (to < 0 || to >= model.value.length) return;
  const arr = [...model.value];
  [arr[from]!, arr[to]!] = [arr[to]!, arr[from]!];
  model.value = arr;
}

function updateBlockData(index: number, data: Record<string, unknown>) {
  const arr = [...model.value];
  arr[index] = { ...arr[index]!, data } as ContentBlock;
  model.value = arr;
}
</script>

<template>
  <div class="space-y-4">
    <BlockWrapper
      v-for="(block, i) in model"
      :key="block.id"
      :type="block.type"
      :index="i"
      :total="model.length"
      :default-open="block.id === lastAddedId"
      @remove="removeBlock(i)"
      @move-up="moveBlock(i, -1)"
      @move-down="moveBlock(i, 1)"
    >
      <component
        :is="blockEditorComponents[block.type]"
        :model-value="normalizeBlockData(block.type, block.data)"
        @update:model-value="updateBlockData(i, $event)"
      />
    </BlockWrapper>

    <BlockPicker @select="addBlock" />
  </div>
</template>
