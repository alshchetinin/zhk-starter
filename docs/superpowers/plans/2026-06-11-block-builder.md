# Редактор блоков (превью + dev-билдер схемы) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превью-картинки блоков в пикере + редактирование схемы полей блока из админки (как Strapi content-type builder) с записью в исходники и мгновенным подтягиванием через HMR.

**Architecture:** Декларативные `fields: BlockField[]` добавляются в `defineBlock` (12 существующих определений мигрируются), генератор эмитит fields + Zod из одного источника. Существующий oRPC-роутер `dev.blocks` (list/create/delete уже есть) дополняется процедурами `update` и `uploadPreview`. Admin-страница `/dev/blocks/[type]` редактирует поля; превью — PNG по конвенции `apps/admin/public/block-previews/{type}.png` с `@error`-fallback на иконку.

**Tech Stack:** Nuxt 4 (admin SPA), oRPC + Zod, @nuxt/ui v4, vue-query, vitest (добавляется), tsx-генераторы в `scripts/generate-block/`.

**Спека:** `docs/superpowers/specs/2026-06-11-block-builder-design.md` · **Issue:** #57 · **Ветка:** `feat/57-block-builder`

**Контекст для исполнителя (что уже существует):**

- `packages/api/src/routers/dev/blocks.ts` — oRPC `dev.blocks.list/create/delete`, guard `devProcedure` (NODE_ENV ≠ production + admin). `create` динамически импортирует генераторы из `scripts/generate-block/generators/*`.
- `apps/admin/app/pages/dev/blocks/index.vue` (список + удаление), `create.vue` (форма создания с полями и subFields).
- Навигация: раздел «Разработка» в `useNavigation.ts` уже скрыт вне `import.meta.dev`.
- `scripts/generate-block/` — CLI-генератор: `field-types.ts` (10 типов), `generators/{block-definition,editor-component,web-renderer}.ts`, `prompts.ts` (типы `FieldInfo`/`BlockInfo`).
- `packages/api/src/shared/blocks/` — `_core.ts` (defineBlock), `index.ts` (allBlocks, contentBlockSchema, getBlockDefaultData), 12 определений: about-company, about-features, about-project, career, contacts, hero-fullscreen, infrastructure-tabs, project-gallery, project-infrastructure, project-location, project-stats, temas.
- Тестовой инфраструктуры в репо нет.

---

### Task 1: Vitest-инфраструктура

**Files:**
- Modify: `package.json` (корень)
- Create: `vitest.config.ts` (корень)

- [ ] **Step 1: Установить vitest**

```bash
pnpm add -D -w vitest
```

- [ ] **Step 2: Создать `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "scripts/**/__tests__/**/*.test.ts",
      "packages/**/__tests__/**/*.test.ts",
    ],
  },
});
```

- [ ] **Step 3: Добавить скрипт в корневой `package.json`**

В `"scripts"` добавить:

```json
"test": "vitest run"
```

- [ ] **Step 4: Проверить запуск**

Run: `pnpm vitest run --passWithNoTests`
Expected: exit 0, "No test files found" — инфраструктура работает.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "chore(test): vitest-инфраструктура (#57)"
```

---

### Task 2: BlockField + fields в defineBlock + normalizeBlockData + миграция 12 определений

**Files:**
- Modify: `packages/api/src/shared/blocks/_core.ts`
- Modify: `packages/api/src/shared/blocks/index.ts`
- Modify: все 12 определений в `packages/api/src/shared/blocks/`
- Test: `packages/api/src/shared/blocks/__tests__/blocks.test.ts`

- [ ] **Step 1: Написать падающие тесты**

Создать `packages/api/src/shared/blocks/__tests__/blocks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { allBlocks, normalizeBlockData } from "../index";
import type { BlockType } from "../index";

describe("fields consistency", () => {
  for (const block of allBlocks) {
    it(`${block.type}: имена fields совпадают с defaultData и dataSchema`, () => {
      const fieldNames = block.fields.map((f) => f.name);
      // без дублей
      expect(new Set(fieldNames).size).toBe(fieldNames.length);
      // fields == ключи defaultData
      const defaultKeys = Object.keys(block.defaultData as Record<string, unknown>);
      expect([...fieldNames].sort()).toEqual([...defaultKeys].sort());
      // fields == ключи dataSchema (z.object shape)
      const shape = (block.dataSchema as unknown as z.ZodObject<z.ZodRawShape>).shape;
      expect(Object.keys(shape).sort()).toEqual([...fieldNames].sort());
    });
  }
});

describe("normalizeBlockData", () => {
  it("подставляет default для отсутствующих ключей", () => {
    const data = normalizeBlockData("project-stats" as BlockType, { projectId: "p1" });
    expect(data).toEqual({ projectId: "p1", showFree: true, showTotal: true });
  });

  it("не перетирает существующие значения", () => {
    const data = normalizeBlockData("project-stats" as BlockType, {
      projectId: "p1",
      showFree: false,
      showTotal: false,
    });
    expect(data).toEqual({ projectId: "p1", showFree: false, showTotal: false });
  });

  it("терпит неизвестный тип блока", () => {
    const data = normalizeBlockData("nope" as BlockType, { a: 1 });
    expect(data).toEqual({ a: 1 });
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `pnpm vitest run packages/api`
Expected: FAIL — `normalizeBlockData` не экспортируется, `block.fields` undefined.

- [ ] **Step 3: Обновить `_core.ts`**

Полное новое содержимое `packages/api/src/shared/blocks/_core.ts`:

```ts
import { z } from "zod";

export type BlockCategory = "content" | "project";

export type BlockFieldType =
  | "string"
  | "text"
  | "richtext"
  | "number"
  | "boolean"
  | "url"
  | "image"
  | "images"
  | "select"
  | "repeater";

/**
 * Декларативное описание поля блока — единый source of truth для
 * dev-билдера (/dev/blocks), CLI-генератора и admin-форм.
 */
export interface BlockField {
  name: string;
  type: BlockFieldType;
  label: string;
  required: boolean;
  description?: string;
  /** только для select */
  options?: string[];
  /** только для repeater */
  minItems?: number;
  maxItems?: number;
  subFields?: BlockField[];
}

export interface BlockDefinition<Type extends string = string, Data = unknown> {
  type: Type;
  label: string;
  icon: string;
  description: string;
  category?: BlockCategory;
  fields: BlockField[];
  dataSchema: z.ZodType<Data>;
  defaultData: Data;
  schema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<Type>;
    data: z.ZodType<Data>;
  }>;
}

interface DefineBlockInput<Type extends string, Data> {
  type: Type;
  label: string;
  icon: string;
  description: string;
  category?: BlockCategory;
  fields: BlockField[];
  dataSchema: z.ZodType<Data>;
  defaultData: Data;
}

export function defineBlock<Type extends string, Data>(
  input: DefineBlockInput<Type, Data>,
): BlockDefinition<Type, Data> {
  const schema = z.object({
    id: z.string(),
    type: z.literal(input.type),
    data: input.dataSchema,
  });
  return { ...input, schema };
}
```

- [ ] **Step 4: Добавить `normalizeBlockData` и реэкспорты в `index.ts`**

В `packages/api/src/shared/blocks/index.ts`:

К строке реэкспорта типов добавить `BlockField`, `BlockFieldType`:

```ts
export type { BlockDefinition, BlockCategory, BlockField, BlockFieldType } from "./_core";
```

После `getBlockDefaultData` добавить:

```ts
/**
 * Мержит сохранённые данные блока с defaultData: новые поля схемы получают
 * default-значения, контент в БД не мигрируется (как в Strapi).
 */
export function normalizeBlockData(
  type: BlockType,
  data: unknown,
): Record<string, unknown> {
  const defaults = (getBlockDefaultData(type) ?? {}) as Record<string, unknown>;
  return { ...defaults, ...((data ?? {}) as Record<string, unknown>) };
}
```

- [ ] **Step 5: Мигрировать 12 определений — добавить `fields`**

В каждый `defineBlock({...})` добавить `fields: [...]` между `category`/`description` и `dataSchema`. Правила обратного вывода поля из существующего Zod (см. `scripts/generate-block/field-types.ts` — fields эмитились бы в этот Zod):

| Zod в dataSchema | BlockField |
| --- | --- |
| `z.string().min(1)` | `type: "string"` (или `text`/`richtext` — см. editor), `required: true` |
| `z.string().optional()` | `type: "string"/"text"/"richtext"`, `required: false` |
| `z.number()` / `.optional()` | `type: "number"`, required по `.optional()` |
| `z.boolean()` | `type: "boolean"` |
| `z.union([z.string().url(), z.literal("")])` | `type: "url"` |
| `z.string().url()` | `type: "image"`, `required: true` |
| `z.string().url().nullable()` | `type: "image"`, `required: false` |
| `z.array(z.string().url())` | `type: "images"` |
| `z.enum([...])` | `type: "select"`, `options: [...]` |
| `z.array(z.object({...}))` (+`.min/.max`) | `type: "repeater"`, `subFields` по тем же правилам, `minItems`/`maxItems` |

Различение `string`/`text`/`richtext` (у всех `z.string()`): открыть admin-редактор блока `apps/admin/app/components/blocks/editors/{PascalCase}Block.vue` — `UInput` → `string`, `UTextarea` → `text`, `UEditor` → `richtext`. **`label` поля брать оттуда же** (атрибут `label` у `UFormField`), `description` — из атрибута `description`.

Готовый пример — `packages/api/src/shared/blocks/project-stats.ts`:

```ts
import { z } from "zod";
import { defineBlock } from "./_core";

export const projectStatsBlock = defineBlock({
  type: "project-stats",
  label: "Статистика квартир",
  icon: "i-solar-chart-2-linear",
  description: "Количество свободных и общее число квартир",
  category: "project",
  fields: [
    { name: "projectId", type: "string", label: "Проект", required: true },
    { name: "showFree", type: "boolean", label: "Показывать свободные", required: true },
    { name: "showTotal", type: "boolean", label: "Показывать всего", required: true },
  ],
  dataSchema: z.object({
    projectId: z.string().min(1),
    showFree: z.boolean().default(true),
    showTotal: z.boolean().default(true),
  }),
  defaultData: {
    projectId: "",
    showFree: true,
    showTotal: true,
  },
});
```

Остальные 11 файлов мигрировать по тем же правилам: about-company, about-features, about-project, career, contacts, hero-fullscreen, infrastructure-tabs, project-gallery, project-infrastructure, project-location, temas. `dataSchema` и `defaultData` **не менять** — только добавить `fields`. Корректность закрывает consistency-тест из Step 1 (имена/состав) + ручная сверка типов по таблице.

- [ ] **Step 6: Запустить тесты**

Run: `pnpm vitest run packages/api`
Expected: PASS — все consistency-тесты и normalize-тесты зелёные.

- [ ] **Step 7: Проверить типы**

Run: `pnpm check-types`
Expected: exit 0 (все 12 определений имеют обязательное `fields`).

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/shared/blocks/
git commit -m "feat(blocks): декларативные fields в defineBlock + normalizeBlockData (#57)"
```

---

> **Поправка по ходу исполнения (Task 2):** добавлен тип поля `strings`
> (массив произвольных строк, редактор — `TagInput`) для полей вида
> `z.array(z.string())` (например, `contacts.contactIds`). Tasks 3–5 включают
> его поддержку: FIELD_TYPES в генераторе, enum в dev-роутере, список типов
> в admin-форме.

> **Поправка по ходу исполнения (Task 3, итог quality-ревью):** для lossless
> round-trip в `BlockField` добавлено опциональное `default?: unknown`
> (значение в defaultData, если отличается от канонического для типа);
> эмиттер учитывает его в `resolveDefaultValue`/`emitFieldLiteral`; 12
> определений приведены к канонической форме эмиттера (`.default()` из Zod
> заменён на `field.default`, поведение defaultData сохранено байт-в-байт);
> idempotency-тест закрепляет «файл определения == канонической эмиссии».
> Последствия для следующих задач: **Task 4** — `fieldSchema` в dev-роутере
> дополняется `default: z.unknown().optional()`; **Task 5** —
> `serializeBlockField` обязан переносить `default` (`if (f.default !==
> undefined) out.default = f.default;`), иначе сохранение из UI потеряет
> дефолты. Также `writeFile` в scripts стал атомарным (tmp + rename),
> `FIELD_TYPES` типизирован как `Record<BlockFieldType, FieldType>`.

### Task 3: Генератор — эмиссия fields + update-режим

**Files:**
- Modify: `scripts/generate-block/prompts.ts`
- Modify: `scripts/generate-block/field-types.ts` (новый тип `strings`)
- Modify: `scripts/generate-block/generators/block-definition.ts`
- Test: `scripts/generate-block/__tests__/generators.test.ts`

**Новый тип в `scripts/generate-block/field-types.ts`** — добавить в `FIELD_TYPES` после `images`:

```ts
  strings: {
    label: "Список строк (array of strings)",
    zodType: "z.array(z.string())",
    tsType: "string[]",
    defaultValue: "[]",
    vueTemplate: (ctx) => {
      const m = ctx.modelPrefix ?? "model";
      const u = ctx.updateFn ?? "set";
      return `    ${formFieldOpen(ctx)}\n      <TagInput :model-value="${m}.${ctx.fieldName}" @update:model-value="${u}('${ctx.fieldName}', $event)" />\n    </UFormField>`;
    },
  },
```

- [ ] **Step 1: Написать падающие тесты**

Создать `scripts/generate-block/__tests__/generators.test.ts`:

```ts
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
  it("editor: snapshot", () => {
    generateEditorComponent(root, BLOCK);
    expect(read("apps/admin/app/components/blocks/editors/TestCardsBlock.vue")).toMatchSnapshot();
  });

  it("renderer: snapshot", () => {
    generateWebRenderer(root, BLOCK);
    expect(read("apps/web/app/components/blocks/renderers/TestCardsBlock.vue")).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падают**

Run: `pnpm vitest run scripts`
Expected: FAIL — `updateBlockDefinition` не экспортируется; в snapshot определения нет `fields:` (первый тест упадёт на `toContain("fields: [")`).

- [ ] **Step 3: `prompts.ts` — FieldInfo как алиас BlockField**

В `scripts/generate-block/prompts.ts` заменить интерфейс `FieldInfo` (строки 4–15):

```ts
import type { BlockField } from "../../packages/api/src/shared/blocks/_core.js";

export type FieldInfo = BlockField;
```

`BlockInfo` не меняется (поле `fields: FieldInfo[]` остаётся). Ниже по файлу в `collectSingleField` каст `type: fieldType as string` заменить на:

```ts
type: fieldType as FieldInfo["type"],
```

- [ ] **Step 4: `block-definition.ts` — эмиссия fields + update**

Полное новое содержимое `scripts/generate-block/generators/block-definition.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { FIELD_TYPES } from "../field-types.js";
import { readFile, writeFile, toCamelCase } from "../utils.js";
import type { BlockInfo, FieldInfo } from "../prompts.js";

function resolveZodType(field: FieldInfo): string {
  if (field.type === "repeater" && field.subFields) {
    const subFieldsCode = field.subFields
      .map((sf) => `    ${sf.name}: ${resolveZodType(sf)},`)
      .join("\n");
    let base = `z.array(z.object({\n${subFieldsCode}\n  }))`;
    if (field.minItems !== undefined && field.minItems > 0) {
      base += `.min(${field.minItems})`;
    }
    if (field.maxItems !== undefined) {
      base += `.max(${field.maxItems})`;
    }
    return field.required ? base : `${base}.optional()`;
  }

  const ft = FIELD_TYPES[field.type]!;
  const base = typeof ft.zodType === "function" ? ft.zodType(field.options) : ft.zodType;

  if (field.required) {
    return ft.minWhenRequired ? `${base}.min(1)` : base;
  }
  return ft.nullableWhenOptional ? `${base}.nullable()` : `${base}.optional()`;
}

function resolveDefaultValue(field: FieldInfo): string {
  if (field.type === "repeater") return "[]";
  if (!field.required) return "undefined";
  const ft = FIELD_TYPES[field.type]!;
  return typeof ft.defaultValue === "function" ? ft.defaultValue(field.options) : ft.defaultValue;
}

function emitFieldLiteral(f: FieldInfo, indent: string): string {
  const lines = [`${indent}{`];
  lines.push(`${indent}  name: "${f.name}",`);
  lines.push(`${indent}  type: "${f.type}",`);
  lines.push(`${indent}  label: ${JSON.stringify(f.label)},`);
  lines.push(`${indent}  required: ${f.required},`);
  if (f.description) lines.push(`${indent}  description: ${JSON.stringify(f.description)},`);
  if (f.options?.length) lines.push(`${indent}  options: ${JSON.stringify(f.options)},`);
  if (f.minItems !== undefined) lines.push(`${indent}  minItems: ${f.minItems},`);
  if (f.maxItems !== undefined) lines.push(`${indent}  maxItems: ${f.maxItems},`);
  if (f.subFields?.length) {
    lines.push(`${indent}  subFields: [`);
    lines.push(f.subFields.map((sf) => emitFieldLiteral(sf, `${indent}    `)).join("\n"));
    lines.push(`${indent}  ],`);
  }
  lines.push(`${indent}},`);
  return lines.join("\n");
}

function buildBlockDefinitionSource(block: BlockInfo): string {
  const camel = toCamelCase(block.name);

  const fieldLiterals = block.fields
    .map((f) => emitFieldLiteral(f, "    "))
    .join("\n");

  const dataFields = block.fields
    .map((f) => `    ${f.name}: ${resolveZodType(f)},`)
    .join("\n");

  const defaultFields = block.fields
    .map((f) => `    ${f.name}: ${resolveDefaultValue(f)},`)
    .join("\n");

  const categoryLine = block.category ? `  category: "${block.category}",\n` : "";

  return [
    `import { z } from "zod";`,
    `import { defineBlock } from "./_core";`,
    ``,
    `export const ${camel}Block = defineBlock({`,
    `  type: "${block.name}",`,
    `  label: ${JSON.stringify(block.label)},`,
    `  icon: "${block.icon}",`,
    `  description: ${JSON.stringify(block.description)},`,
    categoryLine ? categoryLine.trimEnd() : null,
    `  fields: [`,
    fieldLiterals,
    `  ],`,
    `  dataSchema: z.object({`,
    dataFields,
    `  }),`,
    `  defaultData: {`,
    defaultFields,
    `  },`,
    `});`,
    ``,
  ].filter((l) => l !== null).join("\n");
}

/**
 * Creates `packages/api/src/shared/blocks/{type}.ts` and registers it
 * in `packages/api/src/shared/blocks/index.ts`.
 */
export function generateBlockDefinition(rootDir: string, block: BlockInfo): void {
  const camel = toCamelCase(block.name);
  const blocksDir = path.join(rootDir, "packages/api/src/shared/blocks");
  const blockFile = path.join(blocksDir, `${block.name}.ts`);

  if (fs.existsSync(blockFile)) {
    throw new Error(`Файл ${blockFile} уже существует`);
  }

  writeFile(blockFile, buildBlockDefinitionSource(block));

  const indexFile = path.join(blocksDir, "index.ts");
  let idx = readFile(indexFile);

  const importLine = `import { ${camel}Block } from "./${block.name}";`;
  if (!idx.includes(importLine)) {
    idx = idx.replace(
      /(\nexport \{ defineBlock \})/,
      `\n${importLine}\n$1`,
    );
  }

  const arrayEntry = `  ${camel}Block,`;
  if (!idx.includes(arrayEntry)) {
    idx = idx.replace(
      /] as const satisfies readonly BlockDefinition\[\];/,
      `${arrayEntry}\n] as const satisfies readonly BlockDefinition[];`,
    );
  }

  writeFile(indexFile, idx);
}

/**
 * Rewrites an existing block definition (fields/meta changed in /dev/blocks).
 * Does not touch index.ts registration.
 */
export function updateBlockDefinition(rootDir: string, block: BlockInfo): void {
  const blockFile = path.join(
    rootDir,
    "packages/api/src/shared/blocks",
    `${block.name}.ts`,
  );

  if (!fs.existsSync(blockFile)) {
    throw new Error(`Блок "${block.name}" не существует (${blockFile})`);
  }

  writeFile(blockFile, buildBlockDefinitionSource(block));
}
```

Отличия от текущей версии: `label`/`description` эмитятся через `JSON.stringify` (экранирование кавычек), добавлены `emitFieldLiteral`, `buildBlockDefinitionSource`, `updateBlockDefinition`; зод/дефолты — без изменений.

- [ ] **Step 5: Запустить тесты**

Run: `pnpm vitest run scripts`
Expected: PASS, созданы snapshot-файлы в `scripts/generate-block/__tests__/__snapshots__/`.

Просмотреть snapshot определения глазами: `fields` присутствуют, Zod не изменился по сравнению с форматом существующих блоков.

- [ ] **Step 6: Проверить, что consistency-тест Task 2 всё ещё зелёный и типы сходятся**

Run: `pnpm vitest run && pnpm check-types`
Expected: PASS / exit 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-block/
git commit -m "feat(generator): эмиссия fields в определение + update-режим (#57)"
```

---

### Task 4: dev-роутер — update, uploadPreview, удаление превью

**Files:**
- Modify: `packages/api/src/routers/dev/blocks.ts`

- [ ] **Step 1: Типизировать fieldSchema через BlockField**

В начале файла добавить импорт и заменить аннотацию `fieldSchema` (сейчас инлайновый объектный тип, строки 11–21):

```ts
import type { BlockField } from "../../shared/blocks/_core";

const fieldSchema: z.ZodType<BlockField> = z.lazy(() =>
  z.object({
    name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, "camelCase имя"),
    type: z.enum([
      "string",
      "text",
      "richtext",
      "number",
      "boolean",
      "url",
      "image",
      "images",
      "strings",
      "select",
      "repeater",
    ]),
    label: z.string().min(1),
    options: z.array(z.string()).optional(),
    description: z.string().optional(),
    required: z.boolean(),
    default: z.unknown().optional(),
    subFields: z.array(fieldSchema).optional(),
    minItems: z.number().int().min(0).optional(),
    maxItems: z.number().int().min(1).optional(),
  }),
);
```

- [ ] **Step 2: Добавить константу каталога превью**

Рядом с `BLOCKS_DIR`:

```ts
const PREVIEWS_DIR = path.join(REPO_ROOT, "apps/admin/public/block-previews");
```

- [ ] **Step 3: Добавить процедуру `update`**

В объект `devBlocksRouter` после `create`:

```ts
  update: devProcedure
    .input(blockInfoSchema)
    .handler(async ({ input }) => {
      const blockFile = path.join(BLOCKS_DIR, `${input.name}.ts`);
      if (!fs.existsSync(blockFile)) {
        throw new ORPCError("NOT_FOUND", {
          message: `Блок "${input.name}" не найден`,
        });
      }

      const [{ updateBlockDefinition }, { generateEditorComponent }] = await Promise.all([
        import("../../../../../scripts/generate-block/generators/block-definition.js"),
        import("../../../../../scripts/generate-block/generators/editor-component.js"),
      ]);

      const blockInfo = input as unknown as Parameters<typeof updateBlockDefinition>[1];

      updateBlockDefinition(REPO_ROOT, blockInfo);
      generateEditorComponent(REPO_ROOT, blockInfo);

      return { type: input.name, ok: true };
    }),
```

Тип блока (`name`) служит идентификатором — переименование не поддерживается: для несуществующего имени вернётся NOT_FOUND.

- [ ] **Step 4: Добавить процедуру `uploadPreview`**

После `update`:

```ts
  uploadPreview: devProcedure
    .input(
      z.object({
        type: z.string().regex(/^[a-z][a-z0-9-]*$/),
        /** PNG в base64 без data:-префикса, до ~3 МБ файла */
        dataBase64: z.string().min(1).max(4_500_000),
      }),
    )
    .handler(({ input }) => {
      if (!fs.existsSync(path.join(BLOCKS_DIR, `${input.type}.ts`))) {
        throw new ORPCError("NOT_FOUND", {
          message: `Блок "${input.type}" не найден`,
        });
      }

      const buf = Buffer.from(input.dataBase64, "base64");
      const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      if (!buf.subarray(0, 4).equals(PNG_MAGIC)) {
        throw new ORPCError("BAD_REQUEST", { message: "Файл должен быть PNG" });
      }

      fs.mkdirSync(PREVIEWS_DIR, { recursive: true });
      fs.writeFileSync(path.join(PREVIEWS_DIR, `${input.type}.png`), buf);

      return { ok: true, size: buf.length };
    }),
```

- [ ] **Step 5: Удалять превью при удалении блока**

В handler `delete`, в массив `files` добавить путь превью:

```ts
      const files = [
        blockFile,
        path.join(REPO_ROOT, `apps/admin/app/components/blocks/editors/${pascal}Block.vue`),
        path.join(REPO_ROOT, `apps/web/app/components/blocks/renderers/${pascal}Block.vue`),
        path.join(PREVIEWS_DIR, `${input.type}.png`),
      ];
```

(существующий цикл уже игнорирует ENOENT).

- [ ] **Step 6: Проверка типов**

Run: `pnpm check-types`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/routers/dev/blocks.ts
git commit -m "feat(dev-api): dev.blocks.update + uploadPreview + чистка превью (#57)"
```

---

### Task 5: BlockSchemaForm — общая форма схемы (вынос из create.vue) + reorder

**Files:**
- Create: `apps/admin/app/utils/block-schema.ts`
- Create: `apps/admin/app/components/blocks/BlockSchemaForm.vue`
- Modify: `apps/admin/app/pages/dev/blocks/create.vue`

- [ ] **Step 1: Создать `apps/admin/app/utils/block-schema.ts`**

```ts
import type { BlockField } from "@zhk/api/shared/blocks";

export interface BlockMetaForm {
  name: string;
  label: string;
  description: string;
  icon: string;
  category: "none" | "content" | "project";
}

export const blockFieldTypes = [
  { value: "string", label: "Строка" },
  { value: "text", label: "Многострочный текст" },
  { value: "richtext", label: "Форматированный текст" },
  { value: "number", label: "Число" },
  { value: "boolean", label: "Переключатель" },
  { value: "url", label: "URL-ссылка" },
  { value: "image", label: "Изображение" },
  { value: "images", label: "Галерея изображений" },
  { value: "strings", label: "Список строк" },
  { value: "select", label: "Выбор из списка" },
  { value: "repeater", label: "Повторяемый блок" },
] as const;

export const blockSubFieldTypes = blockFieldTypes.filter((t) => t.value !== "repeater");

/** Очищает поле перед отправкой: трим, опции только у select и т.п. */
export function serializeBlockField(f: BlockField): BlockField {
  const out: BlockField = {
    name: f.name.trim(),
    type: f.type,
    label: f.label.trim(),
    required: f.required,
  };
  if (f.description) out.description = f.description;
  // default не редактируется в UI, но обязан переживать round-trip
  if (f.default !== undefined) out.default = f.default;
  if (f.type === "select") {
    const opts = (f.options ?? []).map((s) => s.trim()).filter(Boolean);
    if (opts.length) out.options = opts;
  }
  if (f.type === "repeater") {
    if (f.minItems !== undefined && f.minItems !== null) out.minItems = Number(f.minItems);
    if (f.maxItems !== undefined && f.maxItems !== null) out.maxItems = Number(f.maxItems);
    if (f.subFields?.length) out.subFields = f.subFields.map(serializeBlockField);
  }
  return out;
}

export function buildBlockPayload(meta: BlockMetaForm, fields: BlockField[]) {
  return {
    name: meta.name.trim(),
    label: meta.label.trim(),
    description: meta.description.trim(),
    icon: meta.icon.trim(),
    ...(meta.category !== "none" ? { category: meta.category } : {}),
    fields: fields.map(serializeBlockField),
  };
}

export function isBlockFormValid(meta: BlockMetaForm, fields: BlockField[]): boolean {
  if (!meta.name || !meta.label || !meta.description || !meta.icon) return false;
  if (!fields.length) return false;
  return fields.every((f) => f.name && f.label);
}
```

- [ ] **Step 2: Создать `apps/admin/app/components/blocks/BlockSchemaForm.vue`**

Форма меты и полей, вынесенная из `create.vue` (та же вёрстка), плюс: перестановка полей (стрелки вверх/вниз), предпросмотр иконки, `name` блокируется в режиме `edit`, hint иконки исправлен на Solar:

```vue
<script setup lang="ts">
import type { BlockField } from "@zhk/api/shared/blocks";
import type { BlockMetaForm } from "~/utils/block-schema";
import { blockFieldTypes, blockSubFieldTypes } from "~/utils/block-schema";

const props = defineProps<{
  mode: "create" | "edit";
}>();

const meta = defineModel<BlockMetaForm>("meta", { required: true });
const fields = defineModel<BlockField[]>("fields", { required: true });

function addField() {
  fields.value = [
    ...fields.value,
    { name: "", type: "string", label: "", required: true },
  ];
}
function removeField(i: number) {
  fields.value = fields.value.filter((_, idx) => idx !== i);
}
function moveField(i: number, dir: -1 | 1) {
  const to = i + dir;
  if (to < 0 || to >= fields.value.length) return;
  const arr = [...fields.value];
  [arr[i]!, arr[to]!] = [arr[to]!, arr[i]!];
  fields.value = arr;
}
function addSubField(parent: BlockField) {
  if (!parent.subFields) parent.subFields = [];
  parent.subFields.push({ name: "", type: "string", label: "", required: true });
}
function removeSubField(parent: BlockField, i: number) {
  parent.subFields!.splice(i, 1);
}
</script>

<template>
  <div class="space-y-4">
    <div class="p-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Имя (kebab-case)" required hint="Например: hero-fullscreen">
          <UInput v-model="meta.name" placeholder="block-name" :disabled="props.mode === 'edit'" />
        </UFormField>
        <UFormField label="Label (RU)" required>
          <UInput v-model="meta.label" placeholder="Название блока" />
        </UFormField>
      </div>
      <UFormField label="Описание" required>
        <UInput v-model="meta.description" />
      </UFormField>
      <div class="grid grid-cols-2 gap-3">
        <UFormField label="Иконка (i-solar-*-linear)" required>
          <UInput v-model="meta.icon">
            <template #trailing>
              <UIcon :name="meta.icon" class="size-4" />
            </template>
          </UInput>
        </UFormField>
        <UFormField label="Категория">
          <USelect
            v-model="meta.category"
            :items="[
              { label: '— без категории —', value: 'none' },
              { label: 'Контент', value: 'content' },
              { label: 'Проектный', value: 'project' },
            ]"
            class="w-full"
          />
        </UFormField>
      </div>
    </div>

    <div class="p-4 rounded-lg border border-(--ui-border) bg-(--ui-bg)">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-medium">Поля</h2>
        <UButton icon="i-solar-add-square-linear" size="sm" variant="soft" @click="addField">
          Добавить поле
        </UButton>
      </div>

      <p v-if="!fields.length" class="text-sm text-(--ui-text-muted) py-4 text-center">
        У блока должно быть хотя бы одно поле
      </p>

      <div v-else class="space-y-3">
        <div
          v-for="(field, i) in fields"
          :key="i"
          class="p-3 rounded-md border border-(--ui-border) bg-(--ui-bg-elevated)/30"
        >
          <div class="flex items-start gap-2">
            <div class="flex flex-col gap-0.5">
              <UButton
                icon="i-solar-alt-arrow-up-linear"
                size="xs"
                variant="ghost"
                :disabled="i === 0"
                @click="moveField(i, -1)"
              />
              <UButton
                icon="i-solar-alt-arrow-down-linear"
                size="xs"
                variant="ghost"
                :disabled="i === fields.length - 1"
                @click="moveField(i, 1)"
              />
            </div>
            <div class="flex-1 grid grid-cols-2 gap-2">
              <UInput v-model="field.name" placeholder="name (camelCase)" size="sm" />
              <UInput v-model="field.label" placeholder="Label" size="sm" />
              <USelect v-model="field.type" :items="[...blockFieldTypes]" size="sm" class="w-full" />
              <div class="flex items-center gap-2">
                <USwitch v-model="field.required" />
                <span class="text-xs">обязательное</span>
              </div>

              <UInput
                v-if="field.type === 'select'"
                :model-value="(field.options ?? []).join(', ')"
                placeholder="опция1, опция2, опция3"
                size="sm"
                class="col-span-2"
                @update:model-value="field.options = String($event).split(',').map(s => s.trim()).filter(Boolean)"
              />

              <div v-if="field.type === 'repeater'" class="col-span-2 grid grid-cols-2 gap-2">
                <UInput v-model.number="field.minItems" type="number" placeholder="min items" size="sm" />
                <UInput v-model.number="field.maxItems" type="number" placeholder="max items" size="sm" />
              </div>
            </div>
            <UButton
              icon="i-solar-trash-bin-trash-linear"
              size="xs"
              color="error"
              variant="ghost"
              @click="removeField(i)"
            />
          </div>

          <div v-if="field.type === 'repeater'" class="mt-3 pl-3 border-l-2 border-(--ui-border)">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-(--ui-text-muted)">Под-поля repeater'а</span>
              <UButton icon="i-solar-add-square-linear" size="xs" variant="ghost" @click="addSubField(field)">
                Под-поле
              </UButton>
            </div>
            <div v-if="field.subFields?.length" class="space-y-2">
              <div
                v-for="(sf, si) in field.subFields"
                :key="si"
                class="flex items-start gap-2"
              >
                <div class="flex-1 grid grid-cols-2 gap-2">
                  <UInput v-model="sf.name" placeholder="name" size="xs" />
                  <UInput v-model="sf.label" placeholder="Label" size="xs" />
                  <USelect v-model="sf.type" :items="[...blockSubFieldTypes]" size="xs" class="w-full" />
                  <div class="flex items-center gap-2">
                    <USwitch v-model="sf.required" />
                    <span class="text-xs">обязательное</span>
                  </div>
                </div>
                <UButton
                  icon="i-solar-close-circle-linear"
                  size="xs"
                  color="error"
                  variant="ghost"
                  @click="removeSubField(field, si)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Переписать `create.vue` на BlockSchemaForm**

Полное новое содержимое `apps/admin/app/pages/dev/blocks/create.vue`:

```vue
<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { BlockField } from "@zhk/api/shared/blocks";
import type { BlockMetaForm } from "~/utils/block-schema";
import { buildBlockPayload, isBlockFormValid } from "~/utils/block-schema";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();
const router = useRouter();

const meta = reactive<BlockMetaForm>({
  name: "",
  label: "",
  description: "",
  icon: "i-solar-box-linear",
  category: "none",
});

const fields = ref<BlockField[]>([]);

const createMutation = useMutation({
  mutationFn: (payload: object) => $orpcClient.dev.blocks.create(payload),
  onSuccess: () => {
    toast.add({ title: "Блок создан", description: "Vite HMR подхватит новые файлы", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.dev.blocks.key() });
    router.push("/dev/blocks");
  },
  onError: (err: Error) => {
    toast.add({ title: "Ошибка создания", description: err.message, color: "error" });
  },
});

const canSubmit = computed(() => isBlockFormValid(meta, fields.value));

function submit() {
  createMutation.mutate(buildBlockPayload(meta, fields.value));
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex items-center gap-2 mb-6">
      <UButton to="/dev/blocks" icon="i-solar-arrow-left-linear" variant="ghost" size="sm" />
      <h1 class="text-2xl font-semibold">Новый блок</h1>
    </div>

    <BlockSchemaForm mode="create" v-model:meta="meta" v-model:fields="fields" />

    <div class="flex justify-end gap-2 mt-4">
      <UButton to="/dev/blocks" variant="ghost">Отмена</UButton>
      <UButton
        color="primary"
        :disabled="!canSubmit"
        :loading="createMutation.isPending.value"
        @click="submit"
      >
        Создать блок
      </UButton>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Проверка типов**

Run: `pnpm check-types`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/app/utils/block-schema.ts apps/admin/app/components/blocks/BlockSchemaForm.vue apps/admin/app/pages/dev/blocks/create.vue
git commit -m "refactor(admin): общая BlockSchemaForm с reorder полей (#57)"
```

---

### Task 6: Страница редактирования `/dev/blocks/[type]` + ссылки из списка

**Files:**
- Create: `apps/admin/app/pages/dev/blocks/[type].vue`
- Modify: `apps/admin/app/pages/dev/blocks/index.vue`
- Create: `apps/admin/public/block-previews/.gitkeep`

- [ ] **Step 1: Создать каталог превью**

```bash
mkdir -p apps/admin/public/block-previews && touch apps/admin/public/block-previews/.gitkeep
```

- [ ] **Step 2: Создать `apps/admin/app/pages/dev/blocks/[type].vue`**

```vue
<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { allBlocks } from "@zhk/api/shared/blocks";
import type { BlockField } from "@zhk/api/shared/blocks";
import type { BlockMetaForm } from "~/utils/block-schema";
import { buildBlockPayload, isBlockFormValid } from "~/utils/block-schema";

const route = useRoute();
const toast = useToast();
const queryClient = useQueryClient();
const { $orpc, $orpcClient } = useNuxtApp();

const type = String(route.params.type);
const def = allBlocks.find((b) => b.type === type);

if (!def) {
  throw createError({ statusCode: 404, statusMessage: `Блок "${type}" не найден` });
}

const meta = reactive<BlockMetaForm>({
  name: def.type,
  label: def.label,
  description: def.description,
  icon: def.icon,
  category: def.category ?? "none",
});

const fields = ref<BlockField[]>(structuredClone(def.fields));

const updateMutation = useMutation({
  mutationFn: (payload: object) => $orpcClient.dev.blocks.update(payload),
  onSuccess: () => {
    toast.add({ title: "Схема обновлена", description: "Vite HMR подхватит изменения", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.dev.blocks.key() });
  },
  onError: (err: Error) => {
    toast.add({ title: "Ошибка сохранения", description: err.message, color: "error" });
  },
});

const canSubmit = computed(() => isBlockFormValid(meta, fields.value));

function submit() {
  updateMutation.mutate(buildBlockPayload(meta, fields.value));
}

// --- Превью ---
const previewVersion = ref(0);
const previewBroken = ref(false);
const previewSrc = computed(() => `/block-previews/${type}.png?v=${previewVersion.value}`);

const uploadMutation = useMutation({
  mutationFn: (payload: { type: string; dataBase64: string }) =>
    $orpcClient.dev.blocks.uploadPreview(payload),
  onSuccess: () => {
    previewBroken.value = false;
    previewVersion.value += 1;
    toast.add({ title: "Превью загружено", color: "success" });
  },
  onError: (err: Error) => {
    toast.add({ title: "Ошибка загрузки превью", description: err.message, color: "error" });
  },
});

function onPreviewFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const dataBase64 = String(reader.result).split(",")[1] ?? "";
    uploadMutation.mutate({ type, dataBase64 });
  };
  reader.readAsDataURL(file);
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex items-center gap-2 mb-6">
      <UButton to="/dev/blocks" icon="i-solar-arrow-left-linear" variant="ghost" size="sm" />
      <h1 class="text-2xl font-semibold">{{ def!.label }}</h1>
      <code class="text-xs text-(--ui-text-dimmed) font-mono">{{ type }}</code>
    </div>

    <UAlert
      icon="i-solar-info-circle-linear"
      color="warning"
      variant="soft"
      title="Сохранение перегенерирует файлы"
      description="Определение блока и admin-редактор будут перезаписаны — ручные правки редактора (например, кастомные компоненты) потеряются. Переименованное поле оставит данные страниц под старым ключом. Web-рендерер не затрагивается."
      class="mb-4"
    />

    <div class="p-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) mb-4">
      <h2 class="font-medium mb-3">Превью в пикере</h2>
      <div class="flex items-start gap-4">
        <img
          v-if="!previewBroken"
          :src="previewSrc"
          alt=""
          class="w-48 rounded-md border border-(--ui-border) object-cover"
          @error="previewBroken = true"
        />
        <div v-else class="w-48 aspect-[16/9] rounded-md border border-dashed border-(--ui-border) flex items-center justify-center">
          <UIcon :name="def!.icon" class="size-8 text-(--ui-text-dimmed)" />
        </div>
        <div class="space-y-2">
          <UInput type="file" accept="image/png" :loading="uploadMutation.isPending.value" @change="onPreviewFile" />
          <p class="text-xs text-(--ui-text-muted)">
            PNG-скриншот блока (например, из Figma). Сохраняется в
            <code class="font-mono">apps/admin/public/block-previews/{{ type }}.png</code> — закоммить в git.
          </p>
        </div>
      </div>
    </div>

    <BlockSchemaForm mode="edit" v-model:meta="meta" v-model:fields="fields" />

    <div class="flex justify-end gap-2 mt-4">
      <UButton to="/dev/blocks" variant="ghost">Отмена</UButton>
      <UButton
        color="primary"
        :disabled="!canSubmit"
        :loading="updateMutation.isPending.value"
        @click="submit"
      >
        Сохранить схему
      </UButton>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Ссылки на редактирование и мини-превью из списка**

В `apps/admin/app/pages/dev/blocks/index.vue` в `<script setup>` добавить трекинг отсутствующих превью:

```ts
// Типы без превью-PNG — показываем иконку вместо мини-превью.
const withoutPreview = ref(new Set<string>());
function markBroken(type: string) {
  withoutPreview.value = new Set(withoutPreview.value).add(type);
}
```

Заменить строку-карточку блока (div с `v-for="block in data"`) на NuxtLink с мини-превью, кнопку удаления оставить с `@click.prevent.stop`:

```vue
      <NuxtLink
        v-for="block in data"
        :key="block.type"
        :to="`/dev/blocks/${block.type}`"
        class="flex items-center gap-3 p-3 rounded-lg border border-(--ui-border) bg-(--ui-bg) hover:border-(--ui-border-accented) transition-colors"
      >
        <img
          v-if="!withoutPreview.has(block.type)"
          :src="`/block-previews/${block.type}.png`"
          alt=""
          loading="lazy"
          class="w-16 h-10 shrink-0 rounded border border-(--ui-border) object-cover object-top"
          @error="markBroken(block.type)"
        />
        <UIcon v-else :name="block.icon" class="size-5 shrink-0 text-(--ui-text-muted)" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <div class="font-medium">{{ block.label }}</div>
            <UBadge v-if="block.category === 'project'" size="xs" color="info" variant="soft">
              проектный
            </UBadge>
            <code class="text-[11px] text-(--ui-text-dimmed) font-mono">{{ block.type }}</code>
          </div>
          <div class="text-xs text-(--ui-text-muted) truncate">{{ block.description }}</div>
        </div>
        <UButton
          icon="i-solar-trash-bin-trash-linear"
          color="error"
          variant="ghost"
          size="sm"
          :loading="deleteMutation.isPending.value && deleteMutation.variables.value === block.type"
          @click.prevent.stop="confirmDelete(block.type, block.label)"
        />
      </NuxtLink>
```

- [ ] **Step 4: Проверка типов**

Run: `pnpm check-types`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/app/pages/dev/blocks/ apps/admin/public/block-previews/.gitkeep
git commit -m "feat(admin): страница редактирования схемы блока + загрузка превью (#57)"
```

---

### Task 7: Превью в BlockPicker

**Files:**
- Modify: `apps/admin/app/components/blocks/BlockPicker.vue`

- [ ] **Step 1: Переписать BlockPicker с карточками-превью**

Полное новое содержимое `apps/admin/app/components/blocks/BlockPicker.vue`:

```vue
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
```

Примечание: если `:ui="{ content: 'sm:max-w-lg' }"` не расширяет slideover (проверить в браузере), свериться с документацией @nuxt/ui v4 по slot-ключам `USlideover` (context7) и поправить ключ.

- [ ] **Step 2: Проверка типов**

Run: `pnpm check-types`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/components/blocks/BlockPicker.vue
git commit -m "feat(admin): превью-картинки блоков в пикере (#57)"
```

---

### Task 8: normalize-merge данных блоков (admin + web)

**Files:**
- Modify: `apps/admin/app/components/blocks/BlockDynamicZone.vue`
- Modify: `apps/web/app/components/blocks/BlockRenderer.vue`

- [ ] **Step 1: BlockDynamicZone — мерж с defaultData**

В `apps/admin/app/components/blocks/BlockDynamicZone.vue`:

В импорт из `@zhk/api/shared/blocks` добавить `normalizeBlockData`:

```ts
import { type ContentBlock, type BlockType, getBlockDefaultData, normalizeBlockData } from "@zhk/api/shared/blocks";
```

В template передавать редактору нормализованные данные — заменить

```html
        :model-value="block.data"
```

на

```html
        :model-value="normalizeBlockData(block.type, block.data)"
```

Так блок, сохранённый до добавления нового поля, открывается в форме с default-значением этого поля; в БД мерж попадает при первом сохранении.

- [ ] **Step 2: Web BlockRenderer — тот же мерж**

В `apps/web/app/components/blocks/BlockRenderer.vue` импорт и `getProps`:

```ts
import type { ContentBlock } from "@zhk/api/shared/blocks";
import { normalizeBlockData } from "@zhk/api/shared/blocks";
```

```ts
function getProps(block: ContentBlock) {
  return blockRendererComponents[block.type]
    ? normalizeBlockData(block.type, block.data)
    : { ...block.data, blockType: block.type };
}
```

- [ ] **Step 3: Тесты и типы**

Run: `pnpm vitest run && pnpm check-types`
Expected: PASS / exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/components/blocks/BlockDynamicZone.vue apps/web/app/components/blocks/BlockRenderer.vue
git commit -m "feat(blocks): normalize-merge данных блока с defaultData (#57)"
```

---

### Task 9: Документация + финальная верификация

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Обновить CLAUDE.md, раздел «Блочная система»**

После подраздела «Создание блока через CLI» добавить:

```markdown
### Dev-билдер блоков (/dev/blocks)

В dev-режиме админки есть раздел «Разработка → Блоки»: создание, удаление и
**редактирование схемы полей** существующих блоков (как Strapi content-type
builder). Изменения пишутся в исходники (определение + admin-редактор),
Vite HMR подхватывает. Web-рендерер при редактировании полей не трогается —
вёрстку под новые поля добавлять руками.

- Определение блока и admin-редактор — **генерируемые артефакты**: ручные
  правки в них перезапишутся при сохранении из UI.
- `defineBlock` содержит декларативный `fields: BlockField[]` — единый source
  of truth для билдера, генератора и форм; consistency-тест
  (`packages/api/src/shared/blocks/__tests__/`) следит, что fields совпадают
  с dataSchema/defaultData.
- Данные контента в БД не мигрируются: при загрузке блок мержится с
  defaultData (`normalizeBlockData`), новые поля получают default.

### Превью блока в пикере

PNG-скриншот блока кладётся в `apps/admin/public/block-previews/{type}.png`
(руками или загрузкой на странице `/dev/blocks/{type}`) и коммитится в git.
Пикер показывает картинку, при её отсутствии — иконку.
```

- [ ] **Step 2: Прогнать всё**

Run: `pnpm vitest run && pnpm check-types`
Expected: PASS / exit 0.

- [ ] **Step 3: Ручная проверка dev-флоу**

Запустить `pnpm dev` (или `dev:admin` + `dev:server` + `dev:web`), залогиниться в админку (порт 3002):

1. `/dev/blocks` — список открывается, клик по блоку ведёт на `/dev/blocks/{type}`.
2. На странице блока добавить тестовое поле → «Сохранить схему» → открыть страницу с этим блоком (например, `/homepage`) → поле появилось в форме редактора (~1–2 сек HMR).
3. Загрузить PNG-превью → картинка появилась на странице блока; открыть пикер «Добавить блок» → у блока видна картинка, у остальных — иконки.
4. Убрать тестовое поле из схемы → «Сохранить схему» → поле исчезло из формы; `git status` показывает изменённые определение + редактор; web-рендерер не изменён.
5. Откатить тестовые правки файлов: `git checkout -- packages/api/src/shared/blocks apps/admin/app/components/blocks/editors`.

Expected: все пункты воспроизводятся без ошибок в консоли.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: dev-билдер блоков и превью в пикере в CLAUDE.md (#57)"
```

- [ ] **Step 5: Комментарий в issue**

```bash
gh issue comment 57 --body "Реализация по плану docs/superpowers/plans/2026-06-11-block-builder.md завершена: fields в defineBlock + миграция 12 блоков, dev.blocks.update/uploadPreview, страница /dev/blocks/[type], превью в пикере, normalize-merge, vitest-тесты."
```
