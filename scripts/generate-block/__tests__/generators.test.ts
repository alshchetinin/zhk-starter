import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { allBlocks } from "../../../packages/api/src/shared/blocks/index.js";
import {
  buildBlockDefinitionSource,
  generateBlockDefinition,
  updateBlockDefinition,
} from "../generators/block-definition.js";
import { generateEditorComponent } from "../generators/editor-component.js";
import { generateWebRenderer } from "../generators/web-renderer.js";
import type { BlockInfo } from "../prompts.js";

const REPO_ROOT_REAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

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
    { name: "mainProject", type: "project", label: "Проект", required: true },
    { name: "contactList", type: "contacts", label: "Контакты", required: false },
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

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
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

  it("эмитит default в fields-литерале и использует его в defaultData", () => {
    const withDefault: BlockInfo = {
      name: "with-default",
      label: "Блок с дефолтами",
      description: "Проверка field.default",
      icon: "i-solar-box-linear",
      fields: [
        { name: "show", type: "boolean", label: "Показывать", required: true, default: true },
        { name: "title", type: "string", label: "Заголовок", required: false, default: "Контакты" },
        { name: "height", type: "number", label: "Высота", required: true, default: 400 },
      ],
    };
    generateBlockDefinition(root, withDefault);
    const def = read("packages/api/src/shared/blocks/with-default.ts");
    // fields-литералы несут default
    expect(def).toContain("default: true,");
    expect(def).toContain(`default: "Контакты",`);
    expect(def).toContain("default: 400,");
    // defaultData использует default вместо канонического значения
    expect(def).toContain("    show: true,");
    expect(def).toContain(`    title: "Контакты",`);
    expect(def).toContain("    height: 400,");
  });
});

describe("канонический round-trip", () => {
  for (const block of allBlocks) {
    it(`${block.type}: файл определения == канонической эмиссии`, () => {
      const info = {
        name: block.type,
        label: block.label,
        icon: block.icon,
        description: block.description,
        ...(block.category ? { category: block.category } : {}),
        fields: block.fields,
      };
      const file = fs.readFileSync(
        path.join(REPO_ROOT_REAL, "packages/api/src/shared/blocks", `${block.type}.ts`),
        "utf-8",
      );
      expect(buildBlockDefinitionSource(info as BlockInfo)).toBe(file);
    });
  }
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

  it("renderer: snapshot + AppImage для image-полей", () => {
    generateWebRenderer(root, BLOCK);
    const renderer = read("apps/web/app/components/blocks/renderers/TestCardsBlock.vue");
    expect(renderer).toMatchSnapshot();
    expect(renderer).toContain("<AppImage");
    expect(renderer).not.toContain("<img ");
  });
});
