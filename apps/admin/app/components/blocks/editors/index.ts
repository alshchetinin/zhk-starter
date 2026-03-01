import type { Component } from "vue";
import EditorBlock from "./EditorBlock.vue";
import ImageBlock from "./ImageBlock.vue";
import QueteBlock from "./QueteBlock.vue";
import TestAllFieldsBlock from "./TestAllFieldsBlock.vue";
// --- GENERATOR:EDITOR_IMPORT ---

export const blockEditorComponents: Record<string, Component> = {
  editor: EditorBlock,
  image: ImageBlock,
  quete: QueteBlock,
  "test-all-fields": TestAllFieldsBlock,
  // --- GENERATOR:EDITOR_COMPONENT ---
};
