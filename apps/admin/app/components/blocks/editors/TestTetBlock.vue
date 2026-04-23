<script setup lang="ts">
import { toolbarItems } from "~/utils/editor-toolbar";

const model = defineModel<{
  tets: string;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="sss" required>
      <UEditor :model-value="model.tets" @update:model-value="set('tets', $event)" class="min-h-[200px] rounded-md border border-(--ui-border)">
        <template #default="{ editor }">
          <UEditorToolbar :editor="editor" :items="toolbarItems" />
        </template>
      </UEditor>
    </UFormField>
  </div>
</template>
