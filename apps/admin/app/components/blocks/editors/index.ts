import type { Component } from "vue";
import EditorBlock from "./EditorBlock.vue";

export const blockEditorComponents: Record<string, Component> = {
  editor: EditorBlock,
};
