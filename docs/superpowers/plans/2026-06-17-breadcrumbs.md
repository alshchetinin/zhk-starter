# Хлебные крошки Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Хлебные крошки с авто-режимом (CMS — по категории, детальные — по роуту, index — Главная→Раздел) и ручным переопределением на любой странице (своя цепочка / скрыть), редактируемым в админке, со структурным рендером на web и единым источником для визуала и JSON-LD.

**Architecture:** Чистая Zod-схема `BreadcrumbsConfig` в `@zhk/api/shared` (source of truth); loose-зеркало в `@zhk/db/_shared` для jsonb-колонок на `pages`/`news`/`projects`; site-level настройки в `sites.settings.breadcrumbs`. На web — чистый `resolveBreadcrumbs` + composable `useBreadcrumbs` (пишет в `useState`) + компонент `WebBreadcrumbs` в layout, он же эмитит JSON-LD. В админке — переиспользуемый `BreadcrumbsField` + карточка в настройках сайта.

**Tech Stack:** Nuxt 4 (web SSR / admin SPA), Vue 3, oRPC + Zod, Drizzle ORM + PostgreSQL, @nuxt/ui v4, @tanstack/vue-query, Vitest.

---

## Контекст для исполнителя (прочитать до старта)

- **Спека:** [`docs/superpowers/specs/2026-06-17-breadcrumbs-design.md`](../specs/2026-06-17-breadcrumbs-design.md).
- **Запуск тестов:** из корня репо. Один файл: `pnpm vitest run <путь>`. Все: `pnpm test`. Конфиг — единый `vitest.config.ts` в корне.
- **check-types:** `pnpm check-types` (turbo). **ВАЖНО:** Vue SFC типами в репо НЕ проверяются (нет vue-tsc в admin/web) — `.ts`/`.vue <script>` логику проверяем тестами и вручную; финальная визуальная проверка — через preview-инструменты.
- **`@zhk/db` НЕ зависит от `@zhk/api`** (иначе цикл). Поэтому тип jsonb-колонки определяем в `packages/db/src/schema/_shared.ts` (loose), а строгую Zod-схему — в `@zhk/api/shared/breadcrumbs.ts`. Они структурно совпадают (как `ContentBlock` ↔ `contentBlocksSchema`). Это установленный паттерн.
- **Паттерн site-настроек:** `SiteAnalyticsSettings` объявлен и в `packages/db/src/schema/sites.ts`, и в `@zhk/api/shared/tracking.ts` (web импортит из api). Зеркалим этот же приём для `SiteBreadcrumbsSettings`.
- **Update-хендлеры** `pages.update`, `news.update`, `projects.update` используют генерик-луп `for (const [key, value] of Object.entries(fields))` — достаточно добавить поле в input-схему. `pages.create` — явный `.values({...})`, туда поле добавляем руками.
- **Импорт из api shared:** `@zhk/api/*` → `./src/*.ts` (wildcard export), поэтому `import ... from "@zhk/api/shared/breadcrumbs"` валиден.

## Карта файлов

**Создаются:**
- `packages/api/src/shared/breadcrumbs.ts` — Zod-схема + типы + `SiteBreadcrumbsSettings`.
- `packages/api/src/shared/__tests__/breadcrumbs.test.ts`
- `apps/web/app/utils/breadcrumbs.ts` — чистый `resolveBreadcrumbs`.
- `apps/web/app/utils/__tests__/breadcrumbs.test.ts`
- `apps/web/app/composables/useBreadcrumbs.ts`
- `apps/web/app/components/WebBreadcrumbs.vue`
- `apps/admin/app/components/BreadcrumbsField.vue`
- Drizzle-миграция (генерируется).

**Изменяются:**
- `packages/db/src/schema/_shared.ts` — loose-типы `BreadcrumbItem`/`BreadcrumbsConfig`.
- `packages/db/src/schema/sites.ts` — `SiteBreadcrumbsSettings` + `SiteSettings.breadcrumbs`.
- `packages/db/src/schema/{pages,news,projects}.ts` — колонка `breadcrumbs`.
- `packages/api/src/routers/pages.ts` — input create/update + create `.values`.
- `packages/api/src/routers/news.ts` — input update.
- `packages/api/src/routers/projects.ts` — input update.
- `packages/api/src/routers/public/pages.ts` — join `category.title`.
- `packages/api/src/routers/public/site.ts` — отдать `breadcrumbs` в `status`.
- `apps/web/app/composables/useSiteGate.ts` — `breadcrumbs` в `SiteStatus`.
- `apps/web/app/layouts/default.vue` — монтаж `WebBreadcrumbs` + сброс state.
- `apps/web/app/pages/{[...slug],news/[slug],projects/[id],news/index,projects/index,documents/index,promotions/index,index}.vue`.
- `apps/admin/app/pages/{pages/[id],pages/create,news/[id],projects/[id]/edit}.vue` — `BreadcrumbsField`.
- `apps/admin/app/pages/sites/[id]/seo.vue` — карточка «Хлебные крошки».

---

## Task 1: Общая схема `BreadcrumbsConfig` (TDD)

**Files:**
- Create: `packages/api/src/shared/breadcrumbs.ts`
- Test: `packages/api/src/shared/__tests__/breadcrumbs.test.ts`

- [ ] **Step 1: Написать падающий тест**

Create `packages/api/src/shared/__tests__/breadcrumbs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  breadcrumbsConfigSchema,
  defaultBreadcrumbsConfig,
} from "../breadcrumbs";

describe("breadcrumbsConfigSchema", () => {
  it("пустой объект → дефолт auto + []", () => {
    expect(breadcrumbsConfigSchema.parse({})).toEqual({
      mode: "auto",
      items: [],
    });
  });

  it("валидный custom с элементами", () => {
    const parsed = breadcrumbsConfigSchema.parse({
      mode: "custom",
      items: [{ label: "Главная", href: "/" }, { label: "О нас" }],
    });
    expect(parsed.mode).toBe("custom");
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[1]).toEqual({ label: "О нас" });
  });

  it("пустой label отбраковывается", () => {
    expect(() =>
      breadcrumbsConfigSchema.parse({ mode: "custom", items: [{ label: "" }] }),
    ).toThrow();
  });

  it("неизвестный mode отбраковывается", () => {
    expect(() => breadcrumbsConfigSchema.parse({ mode: "weird" })).toThrow();
  });

  it("defaultBreadcrumbsConfig валиден и равен auto/[]", () => {
    expect(breadcrumbsConfigSchema.parse(defaultBreadcrumbsConfig)).toEqual({
      mode: "auto",
      items: [],
    });
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm vitest run packages/api/src/shared/__tests__/breadcrumbs.test.ts`
Expected: FAIL — `Cannot find module '../breadcrumbs'`.

- [ ] **Step 3: Реализовать схему**

Create `packages/api/src/shared/breadcrumbs.ts`:

```ts
import { z } from "zod";

/** Одно звено цепочки. href нет → звено-текст без ссылки. */
export const breadcrumbItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().optional(),
});
export type BreadcrumbItem = z.infer<typeof breadcrumbItemSchema>;

export const breadcrumbsModeSchema = z.enum(["auto", "custom", "hidden"]);
export type BreadcrumbsMode = z.infer<typeof breadcrumbsModeSchema>;

/** Per-page конфиг крошек (хранится в jsonb-колонке). */
export const breadcrumbsConfigSchema = z.object({
  mode: breadcrumbsModeSchema.default("auto"),
  items: z.array(breadcrumbItemSchema).default([]),
});
export type BreadcrumbsConfig = z.infer<typeof breadcrumbsConfigSchema>;

export const defaultBreadcrumbsConfig: BreadcrumbsConfig = {
  mode: "auto",
  items: [],
};

/** Site-level настройки крошек (живут в sites.settings.breadcrumbs). */
export const siteBreadcrumbsSettingsSchema = z.object({
  /** undefined → включено */
  enabled: z.boolean().optional(),
  /** undefined → «Главная» */
  homeLabel: z.string().optional(),
  /** undefined → false (на главной крошки скрыты) */
  showOnHome: z.boolean().optional(),
});
export type SiteBreadcrumbsSettings = z.infer<typeof siteBreadcrumbsSettingsSchema>;
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm vitest run packages/api/src/shared/__tests__/breadcrumbs.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Коммит**

```bash
git add packages/api/src/shared/breadcrumbs.ts packages/api/src/shared/__tests__/breadcrumbs.test.ts
git commit -m "feat(api): схема BreadcrumbsConfig + site-настройки крошек (#76)"
```

---

## Task 2: Loose-типы и колонки в `@zhk/db`

**Files:**
- Modify: `packages/db/src/schema/_shared.ts`
- Modify: `packages/db/src/schema/sites.ts`
- Modify: `packages/db/src/schema/pages.ts`
- Modify: `packages/db/src/schema/news.ts`
- Modify: `packages/db/src/schema/projects.ts`

- [ ] **Step 1: Добавить loose-типы в `_shared.ts`**

В `packages/db/src/schema/_shared.ts` после интерфейса `InfraPin` добавить:

```ts
/** Loose-зеркало BreadcrumbsConfig (строгая Zod-схема — в @zhk/api/shared/breadcrumbs). */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsConfig {
  mode: "auto" | "custom" | "hidden";
  items: BreadcrumbItem[];
}

export const defaultBreadcrumbsValue: BreadcrumbsConfig = { mode: "auto", items: [] };
```

- [ ] **Step 2: Добавить site-настройки в `sites.ts`**

В `packages/db/src/schema/sites.ts` после интерфейса `SiteSeoSettings` (перед `NavTarget`) добавить:

```ts
export interface SiteBreadcrumbsSettings {
  /** undefined → включено */
  enabled?: boolean;
  /** undefined → «Главная» */
  homeLabel?: string;
  /** undefined → false */
  showOnHome?: boolean;
}
```

И в интерфейс `SiteSettings` добавить поле:

```ts
export interface SiteSettings {
  contactsHeaderIds?: string[];
  contactsFooterIds?: string[];
  analytics?: SiteAnalyticsSettings;
  seo?: SiteSeoSettings;
  navigation?: SiteNavigation;
  breadcrumbs?: SiteBreadcrumbsSettings; // ← добавить
}
```

- [ ] **Step 3: Добавить колонку `breadcrumbs` в `pages.ts`**

В `packages/db/src/schema/pages.ts`:
- В импорт из `./_shared` добавить тип: заменить `import type { ContentBlock } from "./_shared";` на
  ```ts
  import type { ContentBlock, BreadcrumbsConfig } from "./_shared";
  import { defaultBreadcrumbsValue } from "./_shared";
  ```
- В определение таблицы `pages`, после колонки `ogImage`, добавить:
  ```ts
  breadcrumbs: jsonb("breadcrumbs")
    .$type<BreadcrumbsConfig>()
    .notNull()
    .default(defaultBreadcrumbsValue),
  ```

- [ ] **Step 4: Добавить колонку `breadcrumbs` в `news.ts`**

В `packages/db/src/schema/news.ts`:
- Заменить `import type { ContentBlock } from "./_shared";` на
  ```ts
  import type { ContentBlock, BreadcrumbsConfig } from "./_shared";
  import { defaultBreadcrumbsValue } from "./_shared";
  ```
- После колонки `ogImage` добавить:
  ```ts
  breadcrumbs: jsonb("breadcrumbs")
    .$type<BreadcrumbsConfig>()
    .notNull()
    .default(defaultBreadcrumbsValue),
  ```

- [ ] **Step 5: Добавить колонку `breadcrumbs` в `projects.ts`**

В `packages/db/src/schema/projects.ts`:
- В импорт `import type { InfraCategory, InfraPin } from "./_shared";` добавить `BreadcrumbsConfig`, и добавить рядом `import { defaultBreadcrumbsValue } from "./_shared";`
- После колонки `infrastructurePins` добавить:
  ```ts
  breadcrumbs: jsonb("breadcrumbs")
    .$type<BreadcrumbsConfig>()
    .notNull()
    .default(defaultBreadcrumbsValue),
  ```
  (`jsonb` уже импортирован в projects.ts.)

- [ ] **Step 6: Сгенерировать и применить миграцию**

Run:
```bash
pnpm --filter @zhk/db db:generate
```
Проверить созданный SQL в `packages/db/drizzle/` — должно быть 3× `ADD COLUMN "breadcrumbs" jsonb NOT NULL DEFAULT '{"mode":"auto","items":[]}'::jsonb`.

Применить (dev):
```bash
pnpm --filter @zhk/db db:push
```
Expected: схема синхронизирована без ошибок.

- [ ] **Step 7: Проверка типов**

Run: `pnpm check-types`
Expected: без новых ошибок (учесть пред-существующие ошибки в integration.ts/sections.ts/social-links.ts/sync.ts — они НЕ из этой задачи).

- [ ] **Step 8: Коммит**

```bash
git add packages/db
git commit -m "feat(db): колонка breadcrumbs (pages/news/projects) + site-настройки (#76)"
```

---

## Task 3: API — input-схемы и join категории

**Files:**
- Modify: `packages/api/src/routers/pages.ts`
- Modify: `packages/api/src/routers/news.ts`
- Modify: `packages/api/src/routers/projects.ts`
- Modify: `packages/api/src/routers/public/pages.ts`
- Modify: `packages/api/src/routers/public/site.ts`

- [ ] **Step 1: pages.ts — импорт схемы**

В начало `packages/api/src/routers/pages.ts` (рядом с `import { contentBlocksSchema } from "../shared/blocks";`) добавить:

```ts
import { breadcrumbsConfigSchema, defaultBreadcrumbsConfig } from "../shared/breadcrumbs";
```

- [ ] **Step 2: pages.ts — create input + values**

В `create` input-объект (после `ogImage: z.string().optional(),`) добавить:
```ts
breadcrumbs: breadcrumbsConfigSchema.optional(),
```
В `create` хендлере в `.values({...})` (после `ogImage: input.ogImage ?? null,`) добавить:
```ts
breadcrumbs: input.breadcrumbs ?? defaultBreadcrumbsConfig,
```

- [ ] **Step 3: pages.ts — update input**

В `update` input-объект (после `ogImage: z.string().nullable().optional(),`) добавить:
```ts
breadcrumbs: breadcrumbsConfigSchema.optional(),
```
(Генерик-луп в хендлере применит автоматически.)

- [ ] **Step 4: news.ts — input update**

В `packages/api/src/routers/news.ts` добавить импорт вверху:
```ts
import { breadcrumbsConfigSchema } from "../shared/breadcrumbs";
```
В `update` input-объект (после `ogImage: z.string().nullable().optional(),`) добавить:
```ts
breadcrumbs: breadcrumbsConfigSchema.optional(),
```

- [ ] **Step 5: projects.ts — input update**

В `packages/api/src/routers/projects.ts` добавить импорт вверху:
```ts
import { breadcrumbsConfigSchema } from "../shared/breadcrumbs";
```
В `update` input-объект (после блока `infrastructurePins`) добавить:
```ts
breadcrumbs: breadcrumbsConfigSchema.optional(),
```

- [ ] **Step 6: public/pages.ts — join категории в getBySlug**

В `packages/api/src/routers/public/pages.ts`, в `getBySlug`, в `db.query.pages.findFirst({...})` добавить `with`:
```ts
const item = await db.query.pages.findFirst({
  where: and(
    eq(pages.siteId, context.siteId),
    eq(pages.slug, input.slug),
    eq(pages.status, "published"),
  ),
  with: { category: { columns: { title: true } } },
});
```
(`breadcrumbs` уже придёт в `...item`.)

- [ ] **Step 7: public/site.ts — отдать breadcrumbs в status**

В `packages/api/src/routers/public/site.ts`, в `status` хендлере, в возвращаемый объект (после `analytics: site.settings?.analytics ?? null,`) добавить:
```ts
breadcrumbs: site.settings?.breadcrumbs ?? null,
```

- [ ] **Step 8: sites.ts — расширить settingsSchema (ОБЯЗАТЕЛЬНО)**

`settingsSchema` в `packages/api/src/routers/sites.ts` — это `z.object({...}).partial()`. Незнакомые ключи Zod **отбрасывает**, поэтому без правки `breadcrumbs` из настроек сайта молча НЕ сохранится.

- Добавить импорт вверху `packages/api/src/routers/sites.ts`:
  ```ts
  import { siteBreadcrumbsSettingsSchema } from "../shared/breadcrumbs";
  ```
- В объект `settingsSchema` (после `navigation: siteNavigationSchema.optional(),`) добавить:
  ```ts
  breadcrumbs: siteBreadcrumbsSettingsSchema.optional(),
  ```
- Merge-логика в хендлере уже верная: `updates.settings = { ...(existing.settings ?? {}), ...settings }` — поверхностный merge верхнего уровня сохраняет прочие ключи (`navigation`/`analytics`/`seo`). SEO-страница уже шлёт только `{ seo }` без потери остального — добавление `breadcrumbs` тем же приёмом безопасно.

- [ ] **Step 9: Проверка типов**

Run: `pnpm check-types`
Expected: без новых ошибок.

- [ ] **Step 10: Коммит**

```bash
git add packages/api
git commit -m "feat(api): breadcrumbs в input pages/news/projects, settingsSchema, join категории, отдача в site.status (#76)"
```

---

## Task 4: Web — чистый `resolveBreadcrumbs` (TDD)

**Files:**
- Create: `apps/web/app/utils/breadcrumbs.ts`
- Test: `apps/web/app/utils/__tests__/breadcrumbs.test.ts`

- [ ] **Step 1: Написать падающий тест**

Create `apps/web/app/utils/__tests__/breadcrumbs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveBreadcrumbs } from "../breadcrumbs";

const HOME = { label: "Главная", href: "/" };

describe("resolveBreadcrumbs", () => {
  it("auto без parent → [Главная, current]", () => {
    expect(
      resolveBreadcrumbs({ auto: { current: "О нас" } }),
    ).toEqual([HOME, { label: "О нас" }]);
  });

  it("auto с parent → [Главная, parent, current]", () => {
    expect(
      resolveBreadcrumbs({
        auto: { current: "Статья", parent: { label: "Новости", href: "/news" } },
      }),
    ).toEqual([HOME, { label: "Новости", href: "/news" }, { label: "Статья" }]);
  });

  it("custom с items → [Главная, ...items]", () => {
    expect(
      resolveBreadcrumbs({
        config: { mode: "custom", items: [{ label: "Каталог", href: "/c" }, { label: "Товар" }] },
        auto: { current: "Игнор" },
      }),
    ).toEqual([HOME, { label: "Каталог", href: "/c" }, { label: "Товар" }]);
  });

  it("custom с пустым items → деградация в auto", () => {
    expect(
      resolveBreadcrumbs({ config: { mode: "custom", items: [] }, auto: { current: "О нас" } }),
    ).toEqual([HOME, { label: "О нас" }]);
  });

  it("mode hidden → null", () => {
    expect(
      resolveBreadcrumbs({ config: { mode: "hidden", items: [] }, auto: { current: "X" } }),
    ).toBeNull();
  });

  it("settings.enabled false → null", () => {
    expect(
      resolveBreadcrumbs({ auto: { current: "X" }, settings: { enabled: false } }),
    ).toBeNull();
  });

  it("isHome без showOnHome → null", () => {
    expect(resolveBreadcrumbs({ auto: { current: "X" }, isHome: true })).toBeNull();
  });

  it("isHome с showOnHome → рендерим", () => {
    expect(
      resolveBreadcrumbs({ auto: { current: "Главная" }, isHome: true, settings: { showOnHome: true } }),
    ).toEqual([HOME, { label: "Главная" }]);
  });

  it("кастомный homeLabel", () => {
    expect(
      resolveBreadcrumbs({ auto: { current: "О нас" }, settings: { homeLabel: "Home" } }),
    ).toEqual([{ label: "Home", href: "/" }, { label: "О нас" }]);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm vitest run apps/web/app/utils/__tests__/breadcrumbs.test.ts`
Expected: FAIL — `Cannot find module '../breadcrumbs'`.

- [ ] **Step 3: Реализовать билдер**

Create `apps/web/app/utils/breadcrumbs.ts`:

```ts
import type {
  BreadcrumbItem,
  BreadcrumbsConfig,
  SiteBreadcrumbsSettings,
} from "@zhk/api/shared/breadcrumbs";

export interface AutoContext {
  /** Текущая страница — последнее звено, без ссылки. */
  current: string;
  /** Промежуточное звено (раздел/категория); href опционален. */
  parent?: BreadcrumbItem;
}

export interface ResolveInput {
  /** Override записи; undefined → авто. */
  config?: BreadcrumbsConfig | null;
  auto: AutoContext;
  settings?: SiteBreadcrumbsSettings | null;
  isHome?: boolean;
}

/**
 * Сводит per-page конфиг + авто-контекст + site-настройки в финальную цепочку.
 * Возвращает null, если крошки не должны рендериться.
 */
export function resolveBreadcrumbs(input: ResolveInput): BreadcrumbItem[] | null {
  const { config, auto, settings, isHome } = input;

  if (settings?.enabled === false) return null;
  if (isHome && !settings?.showOnHome) return null;
  if (config?.mode === "hidden") return null;

  const home: BreadcrumbItem = {
    label: settings?.homeLabel?.trim() || "Главная",
    href: "/",
  };

  if (config?.mode === "custom" && config.items.length > 0) {
    return [home, ...config.items];
  }

  // auto (включая custom с пустым items)
  const trail: BreadcrumbItem[] = [home];
  if (auto.parent) trail.push(auto.parent);
  trail.push({ label: auto.current });
  return trail;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `pnpm vitest run apps/web/app/utils/__tests__/breadcrumbs.test.ts`
Expected: PASS (9 тестов).

- [ ] **Step 5: Коммит**

```bash
git add apps/web/app/utils/breadcrumbs.ts apps/web/app/utils/__tests__/breadcrumbs.test.ts
git commit -m "feat(web): чистый resolveBreadcrumbs + тесты (#76)"
```

---

## Task 5: Web — composable `useBreadcrumbs` + state

**Files:**
- Create: `apps/web/app/composables/useBreadcrumbs.ts`
- Modify: `apps/web/app/composables/useSiteGate.ts`

- [ ] **Step 1: Прокинуть тип в SiteStatus**

В `apps/web/app/composables/useSiteGate.ts`:
- В импорты добавить:
  ```ts
  import type { SiteBreadcrumbsSettings } from "@zhk/api/shared/breadcrumbs";
  ```
- В тип `SiteStatus` добавить поле (после `seo: PublicSiteSeo;`):
  ```ts
  breadcrumbs: SiteBreadcrumbsSettings | null;
  ```

- [ ] **Step 2: Создать composable**

Create `apps/web/app/composables/useBreadcrumbs.ts`:

```ts
import type { MaybeRefOrGetter } from "vue";
import type { BreadcrumbItem, BreadcrumbsConfig } from "@zhk/api/shared/breadcrumbs";
import { resolveBreadcrumbs } from "~/utils/breadcrumbs";

export interface UseBreadcrumbsInput {
  current: string;
  parent?: BreadcrumbItem;
  config?: BreadcrumbsConfig | null;
  isHome?: boolean;
}

/** Глобальный state финальной цепочки. null → крошки не рендерятся. */
export function useBreadcrumbsState() {
  return useState<BreadcrumbItem[] | null>("breadcrumbs", () => null);
}

/**
 * Вызывается в setup страницы. Прогоняет вход через resolveBreadcrumbs
 * с site-настройками из gate и пишет итог в state (реактивно).
 */
export function useBreadcrumbs(input: MaybeRefOrGetter<UseBreadcrumbsInput>): void {
  const state = useBreadcrumbsState();
  const gate = useSiteGate();

  watchEffect(() => {
    const value = toValue(input);
    state.value = resolveBreadcrumbs({
      config: value.config,
      auto: { current: value.current, parent: value.parent },
      settings: gate.value?.breadcrumbs,
      isHome: value.isHome,
    });
  });
}
```

- [ ] **Step 3: Проверка типов**

Run: `pnpm check-types`
Expected: без новых ошибок (composable — `.ts`, проверяется типами).

- [ ] **Step 4: Коммит**

```bash
git add apps/web/app/composables/useBreadcrumbs.ts apps/web/app/composables/useSiteGate.ts
git commit -m "feat(web): useBreadcrumbs composable + breadcrumbs в site gate (#76)"
```

---

## Task 6: Web — компонент `WebBreadcrumbs` + монтаж в layout

**Files:**
- Create: `apps/web/app/components/WebBreadcrumbs.vue`
- Modify: `apps/web/app/layouts/default.vue`

- [ ] **Step 1: Создать компонент**

Create `apps/web/app/components/WebBreadcrumbs.vue`:

```vue
<script setup lang="ts">
const items = useBreadcrumbsState();
const url = useRequestURL();
const route = useRoute();

/** JSON-LD: каждому звену нужен url; у звеньев без href берём текущий путь. */
useJsonLd(() => {
  if (!items.value || items.value.length === 0) return null;
  return buildBreadcrumbJsonLd(
    items.value.map((it) => ({
      name: it.label,
      url: `${url.origin}${it.href ?? route.path}`,
    })),
  );
});
</script>

<template>
  <nav
    v-if="items && items.length"
    aria-label="Хлебные крошки"
    class="breadcrumbs section container-web"
  >
    <ol class="flex flex-wrap items-center gap-2 text-sm text-[var(--web-text-secondary)]">
      <li
        v-for="(item, i) in items"
        :key="i"
        class="flex items-center gap-2"
      >
        <NuxtLink
          v-if="item.href && i < items.length - 1"
          :to="item.href"
          class="hover:text-[var(--web-text-primary)]"
        >
          {{ item.label }}
        </NuxtLink>
        <span v-else :aria-current="i === items.length - 1 ? 'page' : undefined">
          {{ item.label }}
        </span>
        <span v-if="i < items.length - 1" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>
```

Примечание: разметка структурная, минимально стилизованная CSS-токенами `var(--web-*)`. Финальную стилизацию доводит разработчик отдельно.

- [ ] **Step 2: Смонтировать в layout + сброс state на смене роута**

В `apps/web/app/layouts/default.vue`:
- В `<script setup>` (после `const gate = useSiteGate();`) добавить сброс:
  ```ts
  const route = useRoute();
  const breadcrumbs = useBreadcrumbsState();
  watch(
    () => route.fullPath,
    () => {
      breadcrumbs.value = null;
    },
    { flush: "pre" },
  );
  ```
- В шаблоне внутри `<main ...>`, перед `<slot />`, добавить:
  ```vue
  <WebBreadcrumbs />
  ```

- [ ] **Step 3: Дев-проверка рендера**

Запустить web (preview-инструменты), открыть любую CMS-страницу — крошки видны структурно; на главной (без `showOnHome`) — отсутствуют. Подробная проверка — в Task 9.

- [ ] **Step 4: Коммит**

```bash
git add apps/web/app/components/WebBreadcrumbs.vue apps/web/app/layouts/default.vue
git commit -m "feat(web): компонент WebBreadcrumbs в layout + сброс state на роуте (#76)"
```

---

## Task 7: Web — подключить страницы

**Files:**
- Modify: `apps/web/app/pages/[...slug].vue`
- Modify: `apps/web/app/pages/news/[slug].vue`
- Modify: `apps/web/app/pages/projects/[id].vue`
- Modify: `apps/web/app/pages/news/index.vue`
- Modify: `apps/web/app/pages/projects/index.vue`
- Modify: `apps/web/app/pages/documents/index.vue`
- Modify: `apps/web/app/pages/promotions/index.vue`
- Modify: `apps/web/app/pages/index.vue`

- [ ] **Step 1: CMS-страница `[...slug].vue`**

В `<script setup>` после блока `usePageSeo({...})` добавить:
```ts
useBreadcrumbs(() => ({
  current: data.value?.title ?? "",
  parent: data.value?.category?.title
    ? { label: data.value.category.title }
    : undefined,
  config: data.value?.breadcrumbs,
}));
```
(`data.value.category.title` приходит из join в `public.pages.getBySlug`; `data.value.breadcrumbs` — из колонки.)

- [ ] **Step 2: `news/[slug].vue` — заменить хардкод**

Удалить весь блок:
```ts
useJsonLd(() =>
  data.value
    ? buildBreadcrumbJsonLd([
        { name: "Главная", url: `${url.origin}/` },
        { name: "Новости", url: `${url.origin}/news` },
        { name: data.value.title, url: `${url.origin}${route.path}` },
      ])
    : null,
);
```
и на его место поставить:
```ts
useBreadcrumbs(() => ({
  current: data.value?.title ?? "",
  parent: { label: "Новости", href: "/news" },
  config: data.value?.breadcrumbs,
}));
```

- [ ] **Step 3: `projects/[id].vue` — заменить хардкод**

Удалить весь блок:
```ts
useJsonLd(() =>
  data.value
    ? buildBreadcrumbJsonLd([
        { name: "Главная", url: `${url.origin}/` },
        { name: "Проекты", url: `${url.origin}/projects` },
        { name: data.value.name, url: `${url.origin}${route.path}` },
      ])
    : null,
);
```
и на его место поставить:
```ts
useBreadcrumbs(() => ({
  current: data.value?.name ?? "",
  parent: { label: "Проекты", href: "/projects" },
  config: data.value?.breadcrumbs,
}));
```

- [ ] **Step 4: Index-страницы**

В `<script setup>` каждой index-страницы добавить вызов (parent не нужен — Главная → Раздел):

- `news/index.vue`:
  ```ts
  useBreadcrumbs(() => ({ current: "Новости" }));
  ```
- `projects/index.vue`:
  ```ts
  useBreadcrumbs(() => ({ current: "Проекты" }));
  ```
- `documents/index.vue`:
  ```ts
  useBreadcrumbs(() => ({ current: "Документы" }));
  ```
- `promotions/index.vue`:
  ```ts
  useBreadcrumbs(() => ({ current: "Акции" }));
  ```

- [ ] **Step 5: Главная `index.vue`**

В `<script setup>` добавить (на главной крошки скрыты по умолчанию через `showOnHome`):
```ts
useBreadcrumbs(() => ({ current: "Главная", isHome: true }));
```

- [ ] **Step 6: Проверка типов**

Run: `pnpm check-types`
Expected: без новых ошибок (NB: `.vue` SFC типами не проверяются — основная защита тут от ошибок в импортах `.ts`).

- [ ] **Step 7: Коммит**

```bash
git add apps/web/app/pages
git commit -m "feat(web): подключить useBreadcrumbs во все страницы, убрать хардкод JSON-LD (#76)"
```

---

## Task 8: Admin — переиспользуемый `BreadcrumbsField`

**Files:**
- Create: `apps/admin/app/components/BreadcrumbsField.vue`

- [ ] **Step 1: Создать компонент**

Create `apps/admin/app/components/BreadcrumbsField.vue`:

```vue
<script setup lang="ts">
import type { BreadcrumbsConfig, BreadcrumbItem } from "@zhk/api/shared/breadcrumbs";

const model = defineModel<BreadcrumbsConfig>({ required: true });

const modeOptions = [
  { label: "Авто", value: "auto" },
  { label: "Своя цепочка", value: "custom" },
  { label: "Скрыть", value: "hidden" },
];

function setMode(mode: BreadcrumbsConfig["mode"]) {
  model.value = { ...model.value, mode };
}

const items = computed<BreadcrumbItem[]>({
  get: () => model.value.items ?? [],
  set: (items) => {
    model.value = { ...model.value, items };
  },
});

function defaultItem(): BreadcrumbItem {
  return { label: "", href: "" };
}
</script>

<template>
  <div class="space-y-3">
    <UFormField
      label="Режим"
      description="Авто — по структуре сайта; Своя цепочка — задаёте звенья руками; Скрыть — крошки не показываются"
    >
      <USelect
        :model-value="model.mode"
        :items="modeOptions"
        @update:model-value="setMode($event as BreadcrumbsConfig['mode'])"
      />
    </UFormField>

    <div v-if="model.mode === 'custom'" class="space-y-2">
      <p class="text-xs text-(--ui-text-dimmed)">
        Звенья после «Главной». Последнее — текущая страница. Ссылку можно оставить пустой.
      </p>
      <RepeaterField v-model="items" :default-item="defaultItem">
        <template #item="{ item, update }">
          <UFormField label="Подпись">
            <UInput
              :model-value="(item as BreadcrumbItem).label"
              placeholder="Каталог"
              size="sm"
              @update:model-value="update('label', $event)"
            />
          </UFormField>
          <UFormField label="Ссылка" description="Необязательно — без ссылки звено будет текстом">
            <UInput
              :model-value="(item as BreadcrumbItem).href"
              placeholder="/catalog"
              size="sm"
              @update:model-value="update('href', $event)"
            />
          </UFormField>
        </template>
      </RepeaterField>
    </div>
  </div>
</template>
```

Примечание: только `@nuxt/ui` + существующий `RepeaterField` (auto-import). Перед сохранением пустые `href` маппятся в `undefined` в местах использования (см. Task 9) — Zod `href.optional()` принимает и пустую строку, но для чистоты данных чистим её при сабмите.

- [ ] **Step 2: Коммит**

```bash
git add apps/admin/app/components/BreadcrumbsField.vue
git commit -m "feat(admin): переиспользуемый BreadcrumbsField (#76)"
```

---

## Task 9: Admin — подключить редакторы и настройки сайта

**Files:**
- Modify: `apps/admin/app/pages/pages/[id].vue`
- Modify: `apps/admin/app/pages/pages/create.vue`
- Modify: `apps/admin/app/pages/news/[id].vue`
- Modify: `apps/admin/app/pages/projects/[id]/edit.vue`
- Modify: `apps/admin/app/pages/sites/[id]/seo.vue`

Везде используем хелпер нормализации перед сабмитом (чистит пустые href и пустые звенья):

```ts
function cleanBreadcrumbs(bc: BreadcrumbsConfig): BreadcrumbsConfig {
  if (bc.mode !== "custom") return { mode: bc.mode, items: [] };
  return {
    mode: "custom",
    items: bc.items
      .map((it) => ({ label: it.label.trim(), href: it.href?.trim() || undefined }))
      .filter((it) => it.label.length > 0),
  };
}
```

- [ ] **Step 1: `pages/[id].vue`**

- Импорт типа вверху `<script setup>`:
  ```ts
  import type { BreadcrumbsConfig } from "@zhk/api/shared/breadcrumbs";
  ```
- В `reactive(form)` добавить поле:
  ```ts
  breadcrumbs: { mode: "auto", items: [] } as BreadcrumbsConfig,
  ```
- В `whenever(pageData, (val) => {...})` добавить:
  ```ts
  form.breadcrumbs = val.breadcrumbs ?? { mode: "auto", items: [] };
  ```
- Объявить хелпер `cleanBreadcrumbs` (код выше) в `<script setup>`.
- В `updateMutation.mutationFn` `$orpcClient.pages.update({...})` добавить:
  ```ts
  breadcrumbs: cleanBreadcrumbs(form.breadcrumbs),
  ```
- В `onMutate` optimistic `setQueryData` добавить то же поле:
  ```ts
  breadcrumbs: cleanBreadcrumbs(form.breadcrumbs),
  ```
- В шаблоне в сайдбаре (после блока «Категория/Статус», перед `<SeoSidebar>`) добавить карточку:
  ```vue
  <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4">
    <h3 class="text-sm font-semibold">Хлебные крошки</h3>
    <BreadcrumbsField v-model="form.breadcrumbs" />
  </div>
  ```

- [ ] **Step 2: `pages/create.vue`**

- Импорт типа + хелпер `cleanBreadcrumbs` как в Step 1.
- В `reactive(form)` добавить `breadcrumbs: { mode: "auto", items: [] } as BreadcrumbsConfig,`.
- В `createMutation.mutationFn` `$orpcClient.pages.create({...})` добавить:
  ```ts
  breadcrumbs: cleanBreadcrumbs(form.breadcrumbs),
  ```
- В шаблоне в сайдбаре добавить ту же карточку «Хлебные крошки» с `<BreadcrumbsField v-model="form.breadcrumbs" />`.

- [ ] **Step 3: `news/[id].vue`**

- Импорт типа + хелпер `cleanBreadcrumbs`.
- В `reactive(form)` добавить `breadcrumbs: { mode: "auto", items: [] } as BreadcrumbsConfig,`.
- В `whenever(article, (val) => {...})` добавить `form.breadcrumbs = val.breadcrumbs ?? { mode: "auto", items: [] };`.
- В `updateMutation.mutationFn` `$orpcClient.news.update({...})` добавить `breadcrumbs: cleanBreadcrumbs(form.breadcrumbs),`.
- В `onMutate` optimistic-снапшоте добавить то же поле.
- В шаблоне новости добавить (в сайдбар/SEO-секцию, рядом с meta-полями) карточку с `<BreadcrumbsField v-model="form.breadcrumbs" />` и заголовком «Хлебные крошки».

- [ ] **Step 4: `projects/[id]/edit.vue`**

- Импорт типа + хелпер `cleanBreadcrumbs`.
- В `reactive(form)` добавить:
  ```ts
  breadcrumbs: (props.project.breadcrumbs ?? { mode: "auto", items: [] }) as BreadcrumbsConfig,
  ```
- В `saveMutation.mutationFn` `$orpcClient.projects.update({...})` добавить `breadcrumbs: cleanBreadcrumbs(form.breadcrumbs),`.
- В `onMutate` optimistic `setQueryData` добавить то же поле.
- В шаблоне добавить новую `<AppDataCard title="Хлебные крошки">` с `<BreadcrumbsField v-model="form.breadcrumbs" />`.

- [ ] **Step 5: `sites/[id]/seo.vue` — карточка «Хлебные крошки»**

- В `form` (`ref({...})`) добавить поля:
  ```ts
  bcEnabled: true,
  bcHomeLabel: "",
  bcShowOnHome: false,
  ```
- В `watchEffect` (где маппится `data.value.settings`) добавить:
  ```ts
  const bc = data.value.settings?.breadcrumbs;
  form.value.bcEnabled = bc?.enabled ?? true;
  form.value.bcHomeLabel = bc?.homeLabel ?? "";
  form.value.bcShowOnHome = bc?.showOnHome ?? false;
  ```
  (Добавить эти поля в литерал `form.value = {...}`, чтобы сохранить реактивную замену объекта целиком — присвоить их внутри того же объекта.)
- В `updateMutation.mutationFn` `$orpcClient.sites.update({ settings: {...} })` добавить рядом с `seo`:
  ```ts
  breadcrumbs: {
    enabled: form.value.bcEnabled,
    homeLabel: form.value.bcHomeLabel.trim() || undefined,
    showOnHome: form.value.bcShowOnHome,
  },
  ```
- В шаблоне после `</AppDataCard>` (SEO) и перед кнопкой «Сохранить» добавить:
  ```vue
  <AppDataCard title="Хлебные крошки">
    <div class="space-y-3">
      <UFormField label="Показывать крошки" description="Глобальный выключатель для всего сайта">
        <USwitch v-model="form.bcEnabled" />
      </UFormField>
      <UFormField label="Подпись «домой»" description="Первое звено цепочки">
        <UInput v-model="form.bcHomeLabel" placeholder="Главная" size="sm" />
      </UFormField>
      <UFormField label="Показывать на главной" description="Обычно на главной странице крошки не нужны">
        <USwitch v-model="form.bcShowOnHome" />
      </UFormField>
    </div>
  </AppDataCard>
  ```

Примечание: `sites.update` делает поверхностный merge верхнего уровня `settings` (`{ ...existing, ...input }`), поэтому передача `{ seo, breadcrumbs }` заменяет только эти два ключа и сохраняет `navigation`/`analytics`/`contacts*` (подтверждено в Task 3 Step 8 — там же `settingsSchema` уже расширена ключом `breadcrumbs`). Ничего дополнительно проверять не нужно.

- [ ] **Step 6: Проверка типов**

Run: `pnpm check-types`
Expected: без новых ошибок.

- [ ] **Step 7: Коммит**

```bash
git add apps/admin/app/pages
git commit -m "feat(admin): BreadcrumbsField в редакторах pages/news/projects + карточка в настройках сайта (#76)"
```

---

## Task 10: Финальная проверка

**Files:** —

- [ ] **Step 1: Все юнит-тесты**

Run: `pnpm test`
Expected: все проходят, включая новые (`breadcrumbs.test.ts` ×2). Прежний `json-ld.test.ts` зелёный (сигнатуру `buildBreadcrumbJsonLd` не меняли).

- [ ] **Step 2: Типы**

Run: `pnpm check-types`
Expected: без новых ошибок относительно базовой ветки.

- [ ] **Step 3: Браузерная проверка (preview-инструменты)**

Поднять стек (server + web + admin), опираясь на существующую сессию админки. Проверить:
1. **Admin → настройки сайта → SEO:** карточка «Хлебные крошки», тумблеры/инпут сохраняются (перезагрузка страницы → значения на месте).
2. **Admin → редактор страницы:** режим Авто/Своя/Скрыть; в «Своя» — добавление звеньев, реордер, сохранение.
3. **Web CMS-страница:** авто — `Главная → Категория → Заголовок`; «Своя» — заданная цепочка; «Скрыть» — нет крошек.
4. **Web detail (news/projects):** `Главная → Раздел → Элемент`.
5. **Web index:** `Главная → Раздел`. **Главная:** крошек нет (при `showOnHome=false`), есть при `true`.
6. **JSON-LD:** в `<head>` присутствует `BreadcrumbList` с теми же звеньями (View Source / preview_eval).
7. **Глобальный выключатель:** `enabled=false` → ни визуала, ни JSON-LD на всех страницах.

- [ ] **Step 4: Обновить issue**

```bash
gh issue comment 76 --body "Реализовано: схема BreadcrumbsConfig, колонки на pages/news/projects, site-настройки, web-движок + WebBreadcrumbs (единый источник визуала и JSON-LD), admin BreadcrumbsField + карточка настроек. Тесты зелёные, браузерная проверка пройдена."
```

- [ ] **Step 5: Финальный merge/PR**

Использовать skill `superpowers:finishing-a-development-branch` для выбора способа интеграции (merge в main / PR).

---

## Самопроверка плана (выполнено автором)

- **Покрытие спеки:** схема (T1) ✓, db-колонки + site-настройки (T2) ✓, API input + join + site.status (T3) ✓, web-билдер (T4) ✓, composable + gate (T5) ✓, компонент + layout + сброс (T6) ✓, подключение страниц + удаление хардкода (T7) ✓, admin-поле (T8) ✓, admin-редакторы + настройки (T9) ✓, проверки (T10) ✓.
- **Типы согласованы:** `BreadcrumbsConfig`/`BreadcrumbItem`/`SiteBreadcrumbsSettings` определены в T1, импортируются единообразно из `@zhk/api/shared/breadcrumbs` в web/admin; db использует структурный loose-двойник из `_shared.ts` (T2). `resolveBreadcrumbs`/`useBreadcrumbs`/`useBreadcrumbsState` названы консистентно между T4–T7.
- **Без плейсхолдеров:** весь код приведён. Острый угол — `settingsSchema.partial()` отбрасывает незнакомые ключи — закрыт явным шагом T3 Step 8 (расширение схемы + подтверждённый поверхностный merge `sites.update`). Открытых «проверок по месту» не осталось.
