import { z } from "zod";

// --- Base block schema ---

const baseBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
});

// --- Editor block ---

export const editorBlockDataSchema = z.object({
  content: z.string(),
});

export const editorBlockSchema = baseBlockSchema.extend({
  type: z.literal("editor"),
  data: editorBlockDataSchema,
});

// --- Discriminated union of all blocks ---

export const contentBlockSchema = z.discriminatedUnion("type", [
  editorBlockSchema,
]);

export type ContentBlock = z.infer<typeof contentBlockSchema>;

export const contentBlocksSchema = z.array(contentBlockSchema);

// --- Block definitions for admin UI picker ---

export type BlockType = ContentBlock["type"];

export interface BlockDefinition {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
}

export const blockDefinitions: BlockDefinition[] = [
  {
    type: "editor",
    label: "Текстовый редактор",
    icon: "i-tabler-writing",
    description: "Форматированный текст с заголовками, списками, ссылками",
  },
];
