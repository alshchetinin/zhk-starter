import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  generateBlockDefinition,
  updateBlockDefinition,
} from "../generators/block-definition.js";
import { generateEditorComponent } from "../generators/editor-component.js";
import { generateWebRenderer } from "../generators/web-renderer.js";
import type { BlockInfo } from "../prompts.js";

const INDEX_FIXTURE = `import { z } from "zod";
import type { BlockDefinition } from "./_core";

export { defineBlock } from "./_core";

export const allBlocks = [
] as const satisfies readonly BlockDefinition[];
`;

const BLOCK: BlockInfo = {
  name: "test-cards",
  label: "Тестовые карточки",
  description: "Блок для теста генератора",
  icon: "i-solar-box-linear",
  category: "content",
  fields: [
    { name: "title", type: "string", label: "Заголовок", required: true },
    { name: "subtitle", type: "text", label: "Подзаголовок", required: false, description: "Подсказка" },
    { name: "tags", type: "strings", label: "Теги", required: false },
    { name: "size", type: "select", label: "Размер", required: true, options: ["small", "large"] },
    {
      name: "items",
      type: "repeater",
      label: "Карточки",
      required: true,
      minItems: 1,
      maxItems: 6,
      subFields: [
        { name: "name", type: "string", label: "Название", required: true },
        { name: "photo", type: "image", label: "Фото", required: false },
      ],
    },
  ],
};

let root: string;

function scaffold(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-block-"));
  fs.mkdirSync(path.join(dir, "packages/api/src/shared/blocks"), { recursive: true });
  fs.mkdirSync(path.join(dir, "apps/admin/app/components/blocks/editors"), { recursive: true });
  fs.mkdirSync(path.join(dir, "apps/web/app/components/blocks/renderers"), { recursive: true });
  fs.writeFileSync(path.join(dir, "packages/api/src/shared/blocks/index.ts"), INDEX_FIXTURE);
  return dir;
}

beforeEach(() => {
  root = scaffold();
});

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf-8");
}

describe("generateBlockDefinition", () => {
  it("эмитит fields, dataSchema, defaultData и регистрирует в index.ts", () => {
    generateBlockDefinition(root, BLOCK);
    const def = read("packages/api/src/shared/blocks/test-cards.ts");
    expect(def).toMatchSnapshot();
    expect(def).toContain("fields: [");
    expect(def).toContain(`name: "title"`);
    expect(def).toContain(`subFields: [`);
    expect(def).toContain("tags: z.array(z.string()).optional(),");

    const idx = read("packages/api/src/shared/blocks/index.ts");
    expect(idx).toContain(`import { testCardsBlock } from "./test-cards";`);
    expect(idx).toContain("  testCardsBlock,");
  });
});

describe("updateBlockDefinition", () => {
  it("перезаписывает определение без повторной регистрации", () => {
    generateBlockDefinition(root, BLOCK);
    const updated: BlockInfo = {
      ...BLOCK,
      label: "Новый label",
      fields: [
        ...BLOCK.fields,
        { name: "extra", type: "boolean", label: "Новое поле", required: true },
      ],
    };
    updateBlockDefinition(root, updated);

    const def = read("packages/api/src/shared/blocks/test-cards.ts");
    expect(def).toContain(`label: "Новый label"`);
    expect(def).toContain(`name: "extra"`);

    const idx = read("packages/api/src/shared/blocks/index.ts");
    const occurrences = idx.split("testCardsBlock,").length - 1;
    expect(occurrences).toBe(1);
  });

  it("падает, если блока не существует", () => {
    expect(() => updateBlockDefinition(root, BLOCK)).toThrow();
  });
});

describe("editor и renderer", () => {
  it("editor: snapshot (включая TagInput для strings)", () => {
    generateEditorComponent(root, BLOCK);
    const editor = read("apps/admin/app/components/blocks/editors/TestCardsBlock.vue");
    expect(editor).toMatchSnapshot();
    expect(editor).toContain("TagInput");
  });

  it("renderer: snapshot", () => {
    generateWebRenderer(root, BLOCK);
    expect(read("apps/web/app/components/blocks/renderers/TestCardsBlock.vue")).toMatchSnapshot();
  });
});
