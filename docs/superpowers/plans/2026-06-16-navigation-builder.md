# Navigation Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить захардкоженную навигацию хедера/футера на универсальный контракт данных, настраиваемый в админке per-site и потребляемый свёрстанными per-инсталляцию `WebHeader`/`WebFooter`.

**Architecture:** Чистые TS-интерфейсы навигации живут в `packages/db/src/schema/sites.ts` (внутри `SiteSettings.navigation`). Zod-схема, дефолт, чистый резолвер и ремап — в `packages/api/src/shared/navigation.ts` (без node/БД-зависимостей, юнит-тестируемо). Серверная процедура `public.navigation.layout` грузит страницы/категории батчем и зовёт чистый резолвер. Web потребляет resolved-дерево через composable `useSiteNavigation`. Админка редактирует контракт на `@nuxt/ui` репитерах. site-duplication ремапит `pageId`/`categoryId`.

**Tech Stack:** Drizzle (PostgreSQL JSONB), oRPC + Zod, Nuxt 4 (web SSR + admin SPA), @nuxt/ui v4, @tanstack/vue-query, vitest.

**Spec:** [`docs/superpowers/specs/2026-06-16-navigation-builder-design.md`](../specs/2026-06-16-navigation-builder-design.md)

---

## File Structure

- `packages/db/src/schema/sites.ts` (MODIFY) — интерфейсы `NavRoute`, `NavTarget`, `NavItem`, `FooterColumn`, `SiteNavigation` + поле `navigation?` в `SiteSettings`.
- `packages/api/src/shared/navigation.ts` (CREATE) — Zod-схема, `NAV_ROUTES`/`NAV_ROUTE_LABELS`, `defaultSiteNavigation`, `remapNavigationReferences`, `collectNavReferences`, `resolveNavigation`, resolved-типы.
- `packages/api/src/shared/__tests__/navigation.test.ts` (CREATE) — юнит-тесты.
- `packages/api/src/routers/sites.ts` (MODIFY) — `navigation` в `settingsSchema`.
- `packages/api/src/routers/public/navigation.ts` (CREATE) — процедура `layout`.
- `packages/api/src/routers/public/index.ts` (MODIFY) — регистрация роутера.
- `apps/web/app/composables/useSiteNavigation.ts` (CREATE) — composable.
- `apps/web/app/composables/useNavigation.ts` (DELETE) — хардкод.
- `apps/web/app/layouts/default.vue` (MODIFY) — убрать проброс `navItems`.
- `apps/web/app/components/WebHeader.vue` (MODIFY) — потреблять resolved nav.
- `apps/web/app/components/WebFooter.vue` (MODIFY) — потреблять resolved footer columns.
- `apps/admin/app/components/NavTargetSelect.vue` (CREATE) — селектор цели пункта.
- `apps/admin/app/pages/sites/[id]/navigation.vue` (CREATE) — редактор навигации.
- `apps/admin/app/components/AppSidebar.vue` (MODIFY) — ссылка на вкладку навигации.
- `packages/api/src/services/site-duplication.ts` (MODIFY) — ремап навигации.

---

## Task 1: Контракт данных в схеме БД

**Files:**
- Modify: `packages/db/src/schema/sites.ts:38-43`

- [ ] **Step 1: Добавить интерфейсы навигации и поле в `SiteSettings`**

В `packages/db/src/schema/sites.ts` перед `export interface SiteSettings` (строка 38) вставить:

```ts
export type NavRoute =
  | "/"
  | "/projects"
  | "/news"
  | "/documents"
  | "/promotions";

export type NavTarget =
  | { kind: "page"; pageId: string }
  | { kind: "route"; route: NavRoute }
  | { kind: "category"; categoryId: string }
  | { kind: "url"; href: string; external?: boolean }
  | { kind: "action"; modal: string };

export interface NavItem {
  /** Стабильный id для key/реордера в UI */
  id: string;
  /** Подпись; для page/category опц. — фолбэк на title сущности */
  label?: string;
  target: NavTarget;
  /** Выпадашка в хедере (1 уровень вложения) */
  children?: NavItem[];
}

export interface FooterColumn {
  id: string;
  title?: string;
  items: NavItem[];
}

export interface SiteNavigation {
  header: NavItem[];
  footer: FooterColumn[];
}
```

Затем в `SiteSettings` (строки 38-43) добавить поле:

```ts
export interface SiteSettings {
  contactsHeaderIds?: string[];
  contactsFooterIds?: string[];
  analytics?: SiteAnalyticsSettings;
  seo?: SiteSeoSettings;
  navigation?: SiteNavigation;
}
```

- [ ] **Step 2: Проверить типы**

Run: `pnpm check-types`
Expected: PASS (новые типы не используются ещё нигде — ошибок быть не должно).

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/sites.ts
git commit -m "feat(db): типы навигации в SiteSettings (#73)"
```

---

## Task 2: Чистый модуль навигации + юнит-тесты (TDD)

**Files:**
- Create: `packages/api/src/shared/navigation.ts`
- Test: `packages/api/src/shared/__tests__/navigation.test.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `packages/api/src/shared/__tests__/navigation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SiteNavigation } from "@zhk/db/schema";
import {
  siteNavigationSchema,
  defaultSiteNavigation,
  remapNavigationReferences,
  collectNavReferences,
  resolveNavigation,
  NAV_ROUTE_LABELS,
  type NavResolveContext,
} from "../navigation";

const nav: SiteNavigation = {
  header: [
    { id: "a", label: "О нас", target: { kind: "page", pageId: "p1" } },
    { id: "b", target: { kind: "route", route: "/projects" } },
    { id: "c", target: { kind: "category", categoryId: "cat1" } },
    { id: "d", label: "VK", target: { kind: "url", href: "https://vk.com", external: true } },
    { id: "e", label: "Звонок", target: { kind: "action", modal: "zakazat-zvonok" } },
  ],
  footer: [
    { id: "col1", title: "Меню", items: [{ id: "f1", target: { kind: "page", pageId: "p1" } }] },
  ],
};

describe("siteNavigationSchema", () => {
  it("парсит валидную навигацию", () => {
    expect(siteNavigationSchema.parse(nav)).toEqual(nav);
  });

  it("парсит дефолтную навигацию (consistency)", () => {
    expect(() => siteNavigationSchema.parse(defaultSiteNavigation)).not.toThrow();
  });

  it("отклоняет неизвестный kind", () => {
    expect(() =>
      siteNavigationSchema.parse({ header: [{ id: "x", target: { kind: "foo" } }], footer: [] }),
    ).toThrow();
  });

  it("отклоняет невалидный route", () => {
    expect(() =>
      siteNavigationSchema.parse({
        header: [{ id: "x", target: { kind: "route", route: "/nope" } }],
        footer: [],
      }),
    ).toThrow();
  });
});

describe("collectNavReferences", () => {
  it("собирает уникальные pageId и categoryId из хедера и футера, включая children", () => {
    const withChild: SiteNavigation = {
      header: [
        { id: "a", target: { kind: "page", pageId: "p1" }, children: [
          { id: "a1", target: { kind: "page", pageId: "p2" } },
        ] },
      ],
      footer: [{ id: "col", items: [{ id: "f", target: { kind: "category", categoryId: "cat1" } }] }],
    };
    const refs = collectNavReferences(withChild);
    expect(new Set(refs.pageIds)).toEqual(new Set(["p1", "p2"]));
    expect(refs.categoryIds).toEqual(["cat1"]);
  });
});

describe("remapNavigationReferences", () => {
  const pageMap = new Map([["p1", "P1"]]);
  const catMap = new Map([["cat1", "CAT1"]]);

  it("ремапит page и category, не трогает route/url/action", () => {
    const out = remapNavigationReferences(nav, pageMap, catMap)!;
    expect(out.header[0]!.target).toEqual({ kind: "page", pageId: "P1" });
    expect(out.header[1]!.target).toEqual({ kind: "route", route: "/projects" });
    expect(out.header[2]!.target).toEqual({ kind: "category", categoryId: "CAT1" });
    expect(out.header[3]!.target).toEqual({ kind: "url", href: "https://vk.com", external: true });
    expect(out.header[4]!.target).toEqual({ kind: "action", modal: "zakazat-zvonok" });
    expect(out.footer[0]!.items[0]!.target).toEqual({ kind: "page", pageId: "P1" });
  });

  it("рекурсивно ремапит children", () => {
    const withChild: SiteNavigation = {
      header: [{ id: "a", target: { kind: "route", route: "/" }, children: [
        { id: "a1", target: { kind: "page", pageId: "p1" } },
      ] }],
      footer: [],
    };
    const out = remapNavigationReferences(withChild, pageMap, catMap)!;
    expect(out.header[0]!.children![0]!.target).toEqual({ kind: "page", pageId: "P1" });
  });

  it("неизвестный id остаётся как есть; undefined → undefined", () => {
    expect(remapNavigationReferences(undefined, pageMap, catMap)).toBeUndefined();
    const out = remapNavigationReferences(
      { header: [{ id: "a", target: { kind: "page", pageId: "unknown" } }], footer: [] },
      pageMap, catMap,
    )!;
    expect(out.header[0]!.target).toEqual({ kind: "page", pageId: "unknown" });
  });
});

describe("resolveNavigation", () => {
  const ctx: NavResolveContext = {
    pages: new Map([["p1", { slug: "about", title: "О компании" }]]),
    categories: new Map([["cat1", { title: "Правила" }]]),
    pagesByCategory: new Map([["cat1", [
      { slug: "rules-1", title: "Правило 1" },
      { slug: "rules-2", title: "Правило 2" },
    ]]]),
  };

  it("page → href + фолбэк label на title", () => {
    const out = resolveNavigation(
      { header: [{ id: "a", target: { kind: "page", pageId: "p1" } }], footer: [] }, ctx,
    );
    expect(out.header[0]).toMatchObject({ id: "a", label: "О компании", href: "/pages/about" });
  });

  it("явный label переопределяет title", () => {
    const out = resolveNavigation(
      { header: [{ id: "a", label: "О нас", target: { kind: "page", pageId: "p1" } }], footer: [] }, ctx,
    );
    expect(out.header[0]!.label).toBe("О нас");
  });

  it("отсутствующая/неопубликованная страница отфильтровывается", () => {
    const out = resolveNavigation(
      { header: [{ id: "a", target: { kind: "page", pageId: "missing" } }], footer: [] }, ctx,
    );
    expect(out.header).toHaveLength(0);
  });

  it("route → href + дефолтный лейбл", () => {
    const out = resolveNavigation(
      { header: [{ id: "a", target: { kind: "route", route: "/projects" } }], footer: [] }, ctx,
    );
    expect(out.header[0]).toMatchObject({ href: "/projects", label: NAV_ROUTE_LABELS["/projects"] });
  });

  it("category → подпункты-страницы без href у родителя", () => {
    const out = resolveNavigation(
      { header: [{ id: "c", target: { kind: "category", categoryId: "cat1" } }], footer: [] }, ctx,
    );
    expect(out.header[0]!.label).toBe("Правила");
    expect(out.header[0]!.href).toBeUndefined();
    expect(out.header[0]!.children).toEqual([
      { id: "c:rules-1", label: "Правило 1", href: "/pages/rules-1" },
      { id: "c:rules-2", label: "Правило 2", href: "/pages/rules-2" },
    ]);
  });

  it("url → href + external; action → action-маркер", () => {
    const out = resolveNavigation(
      { header: [
        { id: "u", label: "VK", target: { kind: "url", href: "https://vk.com", external: true } },
        { id: "m", label: "Звонок", target: { kind: "action", modal: "zakazat-zvonok" } },
      ], footer: [] }, ctx,
    );
    expect(out.header[0]).toMatchObject({ href: "https://vk.com", external: true });
    expect(out.header[1]).toMatchObject({ action: "zakazat-zvonok", label: "Звонок" });
  });

  it("резолвит футер-колонки", () => {
    const out = resolveNavigation(nav, ctx);
    expect(out.footer[0]!.title).toBe("Меню");
    expect(out.footer[0]!.items[0]).toMatchObject({ href: "/pages/about" });
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pnpm test -- navigation`
Expected: FAIL — `Cannot find module "../navigation"`.

- [ ] **Step 3: Реализовать модуль**

Создать `packages/api/src/shared/navigation.ts`:

```ts
import { z } from "zod";
import type {
  NavItem,
  NavRoute,
  NavTarget,
  FooterColumn,
  SiteNavigation,
} from "@zhk/db/schema";

// Ре-экспорт типов данных навигации — единая точка импорта для admin/web,
// чтобы не тянуть @zhk/db/schema напрямую во фронтовые бандлы.
export type { NavItem, NavRoute, NavTarget, FooterColumn, SiteNavigation } from "@zhk/db/schema";

// --- Системные роуты ---------------------------------------------------------

export const NAV_ROUTES = [
  "/",
  "/projects",
  "/news",
  "/documents",
  "/promotions",
] as const satisfies readonly NavRoute[];

/** Дефолтные подписи системных разделов (Record по union → растёт вместе с NavRoute). */
export const NAV_ROUTE_LABELS: Record<NavRoute, string> = {
  "/": "Главная",
  "/projects": "Проекты",
  "/news": "Новости",
  "/documents": "Документы",
  "/promotions": "Акции",
};

// --- Zod-схема ---------------------------------------------------------------

// Без аннотации z.ZodType<NavTarget> на самом union (discriminatedUnion плохо
// дружит с satisfies) — совместимость с NavTarget проверяется ниже, т.к.
// navItemSchema аннотирован z.ZodType<NavItem> и содержит это поле target.
const navTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("page"), pageId: z.string() }),
  z.object({ kind: z.literal("route"), route: z.enum(NAV_ROUTES) }),
  z.object({ kind: z.literal("category"), categoryId: z.string() }),
  z.object({ kind: z.literal("url"), href: z.string(), external: z.boolean().optional() }),
  z.object({ kind: z.literal("action"), modal: z.string() }),
]);

const navItemSchema: z.ZodType<NavItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string().optional(),
    target: navTargetSchema,
    children: z.array(navItemSchema).optional(),
  }),
);

const footerColumnSchema: z.ZodType<FooterColumn> = z.object({
  id: z.string(),
  title: z.string().optional(),
  items: z.array(navItemSchema),
});

export const siteNavigationSchema: z.ZodType<SiteNavigation> = z.object({
  header: z.array(navItemSchema),
  footer: z.array(footerColumnSchema),
});

// --- Дефолт ------------------------------------------------------------------

export const defaultSiteNavigation: SiteNavigation = {
  header: [
    { id: "projects", target: { kind: "route", route: "/projects" } },
    { id: "news", target: { kind: "route", route: "/news" } },
    { id: "documents", target: { kind: "route", route: "/documents" } },
    { id: "promotions", target: { kind: "route", route: "/promotions" } },
  ],
  footer: [
    {
      id: "nav",
      title: "Навигация",
      items: [
        { id: "f-projects", target: { kind: "route", route: "/projects" } },
        { id: "f-news", target: { kind: "route", route: "/news" } },
        { id: "f-documents", target: { kind: "route", route: "/documents" } },
        { id: "f-promotions", target: { kind: "route", route: "/promotions" } },
      ],
    },
  ],
};

// --- Ремап (для site-duplication) -------------------------------------------

export function remapNavigationReferences(
  nav: SiteNavigation | undefined,
  pageMap: Map<string, string>,
  categoryMap: Map<string, string>,
): SiteNavigation | undefined {
  if (!nav) return nav;
  const remapItem = (item: NavItem): NavItem => {
    let target = item.target;
    if (target.kind === "page") {
      target = { ...target, pageId: pageMap.get(target.pageId) ?? target.pageId };
    } else if (target.kind === "category") {
      target = { ...target, categoryId: categoryMap.get(target.categoryId) ?? target.categoryId };
    }
    return {
      ...item,
      target,
      children: item.children?.map(remapItem),
    };
  };
  return {
    header: nav.header.map(remapItem),
    footer: nav.footer.map((col) => ({ ...col, items: col.items.map(remapItem) })),
  };
}

// --- Сбор ссылок -------------------------------------------------------------

export function collectNavReferences(nav: SiteNavigation): {
  pageIds: string[];
  categoryIds: string[];
} {
  const pageIds = new Set<string>();
  const categoryIds = new Set<string>();
  const walk = (items: NavItem[]) => {
    for (const it of items) {
      if (it.target.kind === "page") pageIds.add(it.target.pageId);
      else if (it.target.kind === "category") categoryIds.add(it.target.categoryId);
      if (it.children) walk(it.children);
    }
  };
  walk(nav.header);
  for (const col of nav.footer) walk(col.items);
  return { pageIds: [...pageIds], categoryIds: [...categoryIds] };
}

// --- Резолв (чистый; данные приходят из БД в роутере) ------------------------

export interface ResolvedNavItem {
  id: string;
  label: string;
  href?: string;
  external?: boolean;
  /** slug модалки для target.kind === "action" */
  action?: string;
  children?: ResolvedNavItem[];
}

export interface ResolvedFooterColumn {
  id: string;
  title?: string;
  items: ResolvedNavItem[];
}

export interface ResolvedNavigation {
  header: ResolvedNavItem[];
  footer: ResolvedFooterColumn[];
}

export interface NavResolveContext {
  /** Только опубликованные страницы сайта: id → { slug, title } */
  pages: Map<string, { slug: string; title: string }>;
  /** Категории сайта: id → { title } */
  categories: Map<string, { title: string }>;
  /** Опубликованные страницы по категории (для авто-подменю) */
  pagesByCategory: Map<string, { slug: string; title: string }[]>;
}

function isPresent<T>(x: T | null): x is T {
  return x !== null;
}

export function resolveNavigation(
  nav: SiteNavigation,
  ctx: NavResolveContext,
): ResolvedNavigation {
  const resolveItem = (item: NavItem): ResolvedNavItem | null => {
    const t = item.target;
    const children = item.children?.map(resolveItem).filter(isPresent);
    switch (t.kind) {
      case "page": {
        const p = ctx.pages.get(t.pageId);
        if (!p) return null;
        return { id: item.id, label: item.label || p.title, href: `/pages/${p.slug}`, children };
      }
      case "route":
        return {
          id: item.id,
          label: item.label || NAV_ROUTE_LABELS[t.route],
          href: t.route,
          children,
        };
      case "category": {
        const c = ctx.categories.get(t.categoryId);
        if (!c) return null;
        const auto = (ctx.pagesByCategory.get(t.categoryId) ?? []).map((p) => ({
          id: `${item.id}:${p.slug}`,
          label: p.title,
          href: `/pages/${p.slug}`,
        }));
        return {
          id: item.id,
          label: item.label || c.title,
          children: [...(children ?? []), ...auto],
        };
      }
      case "url":
        return {
          id: item.id,
          label: item.label || t.href,
          href: t.href,
          external: t.external,
          children,
        };
      case "action":
        return { id: item.id, label: item.label || "", action: t.modal, children };
    }
  };

  const resolveItems = (items: NavItem[]) => items.map(resolveItem).filter(isPresent);

  return {
    header: resolveItems(nav.header),
    footer: nav.footer.map((col) => ({
      id: col.id,
      title: col.title,
      items: resolveItems(col.items),
    })),
  };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `pnpm test -- navigation`
Expected: PASS (все блоки).

- [ ] **Step 5: Проверить типы**

Run: `pnpm check-types`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/shared/navigation.ts packages/api/src/shared/__tests__/navigation.test.ts
git commit -m "feat(api): чистый модуль навигации — схема, резолвер, ремап (#73)"
```

---

## Task 3: Подключить навигацию в `sites.update`

**Files:**
- Modify: `packages/api/src/routers/sites.ts:55-62`

- [ ] **Step 1: Импортировать схему**

В начало `packages/api/src/routers/sites.ts` (рядом с другими импортами из shared) добавить:

```ts
import { siteNavigationSchema } from "../shared/navigation";
```

- [ ] **Step 2: Добавить поле в `settingsSchema`**

Найти `settingsSchema` (строки 55-62) и добавить `navigation`:

```ts
const settingsSchema = z
  .object({
    contactsHeaderIds: z.array(z.string()).optional(),
    contactsFooterIds: z.array(z.string()).optional(),
    analytics: analyticsSchema.optional(),
    seo: seoSchema.optional(),
    navigation: siteNavigationSchema.optional(),
  })
  .partial();
```

Шалоу-мерж в хендлере `update` (`{ ...existing.settings, ...settings }`) уже корректен: при сохранении navigation остальные ключи settings сохраняются.

- [ ] **Step 3: Проверить типы**

Run: `pnpm check-types`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/sites.ts
git commit -m "feat(api): navigation в settingsSchema sites.update (#73)"
```

---

## Task 4: Процедура `public.navigation.layout`

**Files:**
- Create: `packages/api/src/routers/public/navigation.ts`
- Modify: `packages/api/src/routers/public/index.ts`

- [ ] **Step 1: Создать роутер**

Создать `packages/api/src/routers/public/navigation.ts`:

```ts
import { db } from "@zhk/db";
import { pages, pageCategories } from "@zhk/db/schema";
import type { NavItem } from "@zhk/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { publicActiveSiteProcedure } from "../../index";
import {
  collectNavReferences,
  defaultSiteNavigation,
  resolveNavigation,
  type NavResolveContext,
} from "../../shared/navigation";

export const publicNavigationRouter = {
  layout: publicActiveSiteProcedure.handler(async ({ context }) => {
    const nav = context.site.settings?.navigation ?? defaultSiteNavigation;
    const { pageIds, categoryIds } = collectNavReferences(nav);

    // Опубликованные страницы, на которые ссылаются пункты page-типа.
    const pageRows = pageIds.length
      ? await db.query.pages.findMany({
          where: and(
            eq(pages.siteId, context.siteId),
            inArray(pages.id, pageIds),
            eq(pages.status, "published"),
          ),
          columns: { id: true, slug: true, title: true },
        })
      : [];

    // Категории, на которые ссылаются пункты category-типа.
    const catRows = categoryIds.length
      ? await db.query.pageCategories.findMany({
          where: and(
            eq(pageCategories.siteId, context.siteId),
            inArray(pageCategories.id, categoryIds),
          ),
          columns: { id: true, title: true },
        })
      : [];

    // Опубликованные страницы этих категорий — для авто-подменю.
    const catPageRows = categoryIds.length
      ? await db.query.pages.findMany({
          where: and(
            eq(pages.siteId, context.siteId),
            inArray(pages.categoryId, categoryIds),
            eq(pages.status, "published"),
          ),
          columns: { slug: true, title: true, categoryId: true },
          orderBy: [asc(pages.title)],
        })
      : [];

    const pagesByCategory = new Map<string, { slug: string; title: string }[]>();
    for (const p of catPageRows) {
      if (!p.categoryId) continue;
      const arr = pagesByCategory.get(p.categoryId) ?? [];
      arr.push({ slug: p.slug, title: p.title });
      pagesByCategory.set(p.categoryId, arr);
    }

    const ctx: NavResolveContext = {
      pages: new Map(pageRows.map((p) => [p.id, { slug: p.slug, title: p.title }])),
      categories: new Map(catRows.map((c) => [c.id, { title: c.title }])),
      pagesByCategory,
    };

    return resolveNavigation(nav, ctx);
  }),
};
```

- [ ] **Step 2: Зарегистрировать роутер**

В `packages/api/src/routers/public/index.ts` добавить импорт и запись (по образцу `contacts`):

```ts
import { publicNavigationRouter } from "./navigation";
```

И в объект `publicRouter` добавить строку рядом с `contacts`:

```ts
  navigation: publicNavigationRouter,
```

- [ ] **Step 3: Проверить типы**

Run: `pnpm check-types`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/public/navigation.ts packages/api/src/routers/public/index.ts
git commit -m "feat(api): public.navigation.layout с серверным резолвом (#73)"
```

---

## Task 5: Web composable + удаление хардкода

**Files:**
- Create: `apps/web/app/composables/useSiteNavigation.ts`
- Delete: `apps/web/app/composables/useNavigation.ts`
- Modify: `apps/web/app/layouts/default.vue`

- [ ] **Step 1: Создать composable**

Создать `apps/web/app/composables/useSiteNavigation.ts` (образец — `useSiteContacts.ts`):

```ts
import { useQuery } from "@tanstack/vue-query";

export function useSiteNavigation() {
  const { orpc } = useOrpc();
  const query = useQuery(orpc.public.navigation.layout.queryOptions());

  const header = computed(() => query.data.value?.header ?? []);
  const footer = computed(() => query.data.value?.footer ?? []);

  return {
    header,
    footer,
    isPending: query.isPending,
    suspense: query.suspense,
  };
}
```

- [ ] **Step 2: Удалить хардкод-composable**

```bash
git rm apps/web/app/composables/useNavigation.ts
```

- [ ] **Step 3: Убрать проброс `navItems` из layout**

В `apps/web/app/layouts/default.vue` удалить импорт `import { navItems } from "~/composables/useNavigation";` (строка 2) и убрать prop `:nav-items="navItems"` у `<WebHeader>` и `<WebFooter>` (строки 43, 47) — теперь компоненты берут навигацию сами:

```html
<WebHeader />
<!-- ... -->
<WebFooter />
```

- [ ] **Step 4: Проверить, что web стартует без ошибок импорта**

Запустить dev-сервер web через preview-инструменты (`preview_start`), проверить `preview_console_logs` — не должно быть ошибок про `useNavigation`/`navItems`. (Компоненты обновим в Task 6–7; временно `navItems` в них станет неопределён — это допустимо до следующих задач, но коммит делаем после Task 7. Если хочется зелёный промежуточный билд — выполнять Task 5–7 одним блоком перед коммитом.)

- [ ] **Step 5: Commit (вместе с Task 6–7)**

Коммит этой задачи объединяется с Task 6 и 7 (web не компилируется между ними). См. Task 7 Step 4.

---

## Task 6: Рефактор `WebHeader.vue`

**Files:**
- Modify: `apps/web/app/components/WebHeader.vue`

- [ ] **Step 1: Заменить источник пунктов и рендер меню**

В `<script setup>` `WebHeader.vue`:
- Удалить `defineProps<{ navItems: NavItem[] }>()` и импорт типа `NavItem` из `useNavigation`.
- Добавить получение навигации:

```ts
const { header: navItems } = useSiteNavigation();
```

(Остальное — `useSiteContacts`, `useModalAction`, `useTracking`, `primaryContact` — без изменений. CTA-блок «Заказать звонок»/«Выбрать квартиру»/телефон остаётся в вёрстке как есть — это «вид».)

- [ ] **Step 2: Обновить шаблон десктоп-меню**

Пункты теперь `ResolvedNavItem` (поля `href?`, `action?`, `children?`, `external?`). Заменить десктоп-`<nav>` на рендер трёх случаев — ссылка, кнопка-действие, выпадашка:

```html
<nav class="hidden md:flex items-center gap-8">
  <template v-for="item in navItems" :key="item.id">
    <!-- выпадашка -->
    <div v-if="item.children?.length" class="relative group">
      <span class="text-sm font-medium text-[var(--web-text-secondary)] group-hover:text-[var(--web-text-primary)] transition-colors cursor-default">
        {{ item.label }}
      </span>
      <div class="absolute left-0 top-full pt-2 hidden group-hover:block min-w-48 z-50">
        <div class="rounded-lg border border-[var(--web-border)] bg-[var(--web-bg)] py-2 shadow-lg">
          <NuxtLink
            v-for="child in item.children"
            :key="child.id"
            :to="child.href ?? '#'"
            class="block px-4 py-2 text-sm text-[var(--web-text-secondary)] hover:text-[var(--web-text-primary)] hover:bg-[var(--web-bg-muted)] transition-colors"
          >
            {{ child.label }}
          </NuxtLink>
        </div>
      </div>
    </div>
    <!-- действие/модалка -->
    <button
      v-else-if="item.action"
      type="button"
      class="text-sm font-medium text-[var(--web-text-secondary)] hover:text-[var(--web-text-primary)] transition-colors"
      @click="openModal(item.action)"
    >
      {{ item.label }}
    </button>
    <!-- внешняя ссылка -->
    <a
      v-else-if="item.external"
      :href="item.href"
      target="_blank"
      rel="noopener"
      class="text-sm font-medium text-[var(--web-text-secondary)] hover:text-[var(--web-text-primary)] transition-colors"
    >
      {{ item.label }}
    </a>
    <!-- внутренняя ссылка -->
    <NuxtLink
      v-else
      :to="item.href ?? '#'"
      class="text-sm font-medium text-[var(--web-text-secondary)] hover:text-[var(--web-text-primary)] transition-colors"
      active-class="!text-[var(--web-accent)]"
    >
      {{ item.label }}
    </NuxtLink>
  </template>
</nav>
```

- [ ] **Step 3: Обновить мобильное (бургер) меню**

В мобильном выпадающем списке заменить `v-for` по `navItems` аналогично — рендерить ссылку/действие/внешнюю, а для пунктов с `children` выводить заголовок + вложенные ссылки плоским списком:

```html
<template v-for="item in navItems" :key="item.id">
  <div v-if="item.children?.length">
    <div class="px-1 py-2 text-sm font-semibold text-[var(--web-text-primary)]">{{ item.label }}</div>
    <NuxtLink
      v-for="child in item.children"
      :key="child.id"
      :to="child.href ?? '#'"
      class="block px-4 py-2 text-sm text-[var(--web-text-secondary)]"
      @click="mobileOpen = false"
    >
      {{ child.label }}
    </NuxtLink>
  </div>
  <button
    v-else-if="item.action"
    type="button"
    class="block w-full text-left px-1 py-2 text-sm text-[var(--web-text-secondary)]"
    @click="openModal(item.action); mobileOpen = false"
  >
    {{ item.label }}
  </button>
  <a
    v-else-if="item.external"
    :href="item.href"
    target="_blank"
    rel="noopener"
    class="block px-1 py-2 text-sm text-[var(--web-text-secondary)]"
    @click="mobileOpen = false"
  >
    {{ item.label }}
  </a>
  <NuxtLink
    v-else
    :to="item.href ?? '#'"
    class="block px-1 py-2 text-sm text-[var(--web-text-secondary)]"
    @click="mobileOpen = false"
  >
    {{ item.label }}
  </NuxtLink>
</template>
```

> Имя реактивной переменной состояния бургера (`mobileOpen` выше) взять из текущего `WebHeader.vue` — использовать существующее, не вводить новое.

---

## Task 7: Рефактор `WebFooter.vue`

**Files:**
- Modify: `apps/web/app/components/WebFooter.vue`

- [ ] **Step 1: Заменить источник навигации**

В `<script setup>` `WebFooter.vue`:
- Удалить `defineProps<{ navItems: NavItem[] }>()` и импорт `NavItem` из `useNavigation`.
- Добавить:

```ts
const { footer: footerColumns } = useSiteNavigation();
```

(Контакты футера и соцсети — `useSiteContacts`, `socialsFor` — без изменений.)

- [ ] **Step 2: Сделать колонки навигации динамическими**

Заменить статическую колонку «Навигация» (строки ~44-59) на рендер всех `footerColumns` (число колонок = длина массива; «2 vs 4» решается данными). Обновить grid, чтобы число колонок навигации не было захардкожено — например:

```html
<div
  v-for="col in footerColumns"
  :key="col.id"
>
  <h3 v-if="col.title" class="text-sm font-semibold mb-4">{{ col.title }}</h3>
  <nav class="flex flex-col gap-2">
    <template v-for="item in col.items" :key="item.id">
      <a
        v-if="item.external"
        :href="item.href"
        target="_blank"
        rel="noopener"
        class="text-sm text-[var(--web-text-secondary)] hover:text-[var(--web-text-primary)] transition-colors"
      >
        {{ item.label }}
      </a>
      <NuxtLink
        v-else-if="item.href"
        :to="item.href"
        class="text-sm text-[var(--web-text-secondary)] hover:text-[var(--web-text-primary)] transition-colors"
      >
        {{ item.label }}
      </NuxtLink>
      <span v-else class="text-sm text-[var(--web-text-secondary)]">{{ item.label }}</span>
    </template>
  </nav>
</div>
```

> Колонка бренда (логотип + описание) и колонка контактов остаются как есть — это «вид». Сетка-обёртка футера должна корректно вмещать переменное число колонок (например `flex flex-wrap gap-8` или `grid` с `auto-fit`); подогнать существующий класс grid под прототип.

- [ ] **Step 3: Проверить web в браузере (Task 5–7 вместе)**

Запустить preview-стек, открыть сайт:
- `preview_console_logs` — без ошибок.
- `preview_snapshot` — в хедере видны пункты меню (дефолт: Проекты/Новости/Документы/Акции), в футере — колонка «Навигация».
- Проверить выпадашку и бургер (`preview_resize` на мобильный + `preview_click` по бургеру).
- `preview_screenshot` — приложить как доказательство.

- [ ] **Step 4: Commit (Task 5 + 6 + 7)**

```bash
git add apps/web/app/composables/useSiteNavigation.ts apps/web/app/layouts/default.vue apps/web/app/components/WebHeader.vue apps/web/app/components/WebFooter.vue
git rm apps/web/app/composables/useNavigation.ts
git commit -m "feat(web): хедер/футер на данных public.navigation.layout, убрать хардкод (#73)"
```

---

## Task 8: Admin — компонент `NavTargetSelect.vue`

**Files:**
- Create: `apps/admin/app/components/NavTargetSelect.vue`

- [ ] **Step 1: Создать компонент выбора цели пункта**

Создать `apps/admin/app/components/NavTargetSelect.vue`. v-model — `NavTarget`. Грузит страницы/категории/модалки через `$orpc.*.list` (паттерн из ProjectSelector/ContactsSelector). USelect значений без пустых строк (GOTCHA reka-ui):

```vue
<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import {
  NAV_ROUTES,
  NAV_ROUTE_LABELS,
  type NavTarget,
} from "@zhk/api/shared/navigation";

const model = defineModel<NavTarget>({ required: true });
const { $orpc } = useNuxtApp();

const kindItems = [
  { label: "Страница", value: "page" },
  { label: "Раздел сайта", value: "route" },
  { label: "Категория (авто-подменю)", value: "category" },
  { label: "Внешняя ссылка", value: "url" },
  { label: "Действие (модалка)", value: "action" },
] as const;

const routeItems = NAV_ROUTES.map((r) => ({ label: NAV_ROUTE_LABELS[r], value: r }));

const { data: pagesData } = useQuery(
  computed(() => $orpc.pages.list.queryOptions({ input: { page: 1, pageSize: 100 } })),
);
const pageItems = computed(() =>
  (pagesData.value?.data ?? []).map((p) => ({ label: p.title, value: p.id })),
);

const { data: categoriesData } = useQuery(
  computed(() => $orpc.pageCategories.list.queryOptions()),
);
const categoryItems = computed(() =>
  (categoriesData.value ?? []).map((c) => ({ label: c.title, value: c.id })),
);

const { data: modalsData } = useQuery(
  computed(() => $orpc.modals.list.queryOptions({ input: { page: 1, pageSize: 100 } })),
);
const modalItems = computed(() =>
  (modalsData.value?.data ?? []).map((m) => ({ label: m.title, value: m.slug })),
);

// Смена типа → сброс на валидный дефолт этого типа.
function setKind(kind: NavTarget["kind"]) {
  switch (kind) {
    case "page": model.value = { kind: "page", pageId: "" }; break;
    case "route": model.value = { kind: "route", route: "/" }; break;
    case "category": model.value = { kind: "category", categoryId: "" }; break;
    case "url": model.value = { kind: "url", href: "", external: false }; break;
    case "action": model.value = { kind: "action", modal: "" }; break;
  }
}

// Узкие сеттеры (model — дискриминированный union, мутируем через пересоздание).
function patch(part: Partial<NavTarget>) {
  model.value = { ...model.value, ...part } as NavTarget;
}
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    <USelect
      :model-value="model.kind"
      :items="kindItems"
      value-key="value"
      size="sm"
      class="sm:w-48"
      @update:model-value="setKind($event)"
    />

    <USelect
      v-if="model.kind === 'page'"
      :model-value="model.pageId"
      :items="pageItems"
      value-key="value"
      placeholder="Выберите страницу"
      size="sm"
      class="flex-1"
      @update:model-value="patch({ pageId: $event })"
    />

    <USelect
      v-else-if="model.kind === 'route'"
      :model-value="model.route"
      :items="routeItems"
      value-key="value"
      size="sm"
      class="flex-1"
      @update:model-value="patch({ route: $event })"
    />

    <USelect
      v-else-if="model.kind === 'category'"
      :model-value="model.categoryId"
      :items="categoryItems"
      value-key="value"
      placeholder="Выберите категорию"
      size="sm"
      class="flex-1"
      @update:model-value="patch({ categoryId: $event })"
    />

    <div v-else-if="model.kind === 'url'" class="flex flex-1 items-center gap-2">
      <UInput
        :model-value="model.href"
        placeholder="https://…"
        size="sm"
        class="flex-1"
        @update:model-value="patch({ href: $event })"
      />
      <UCheckbox
        :model-value="model.external ?? false"
        label="В новой вкладке"
        @update:model-value="patch({ external: $event === true })"
      />
    </div>

    <USelect
      v-else-if="model.kind === 'action'"
      :model-value="model.modal"
      :items="modalItems"
      value-key="value"
      placeholder="Выберите модалку"
      size="sm"
      class="flex-1"
      @update:model-value="patch({ modal: $event })"
    />
  </div>
</template>
```

> `@zhk/api/shared/navigation` импортируется в admin благодаря wildcard-экспорту `./*` пакета `@zhk/api` (как `@zhk/api/shared/tracking` в settings.vue).

- [ ] **Step 2: Проверить типы admin (через build, т.к. check-types не покрывает SFC)**

Run: `pnpm --filter admin build`
Expected: сборка проходит без ошибок (компонент сам по себе ещё не используется — проверяем, что импорты резолвятся).

> Если сборка целиком тяжёлая/долгая — допустимо отложить проверку до Task 9, где компонент используется, и собрать один раз.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/components/NavTargetSelect.vue
git commit -m "feat(admin): NavTargetSelect — выбор цели пункта навигации (#73)"
```

---

## Task 9: Admin — страница-редактор навигации + ссылка в сайдбаре

**Files:**
- Create: `apps/admin/app/pages/sites/[id]/navigation.vue`
- Modify: `apps/admin/app/components/AppSidebar.vue:175-176`

- [ ] **Step 1: Создать страницу редактора**

Создать `apps/admin/app/pages/sites/[id]/navigation.vue` (структура — копия `seo.vue`: загрузка сайта, форма из refs, mutation на `sites.update`):

```vue
<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  defaultSiteNavigation,
  type NavItem,
  type FooterColumn,
  type SiteNavigation,
} from "@zhk/api/shared/navigation";

const route = useRoute();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data, isPending } = useQuery(
  computed(() => $orpc.sites.getById.queryOptions({ input: { id: id.value } })),
);

useHead({
  title: computed(() => (data.value ? `Навигация — ${data.value.name}` : "Навигация")),
});

const header = ref<NavItem[]>([]);
const footer = ref<FooterColumn[]>([]);

watchEffect(() => {
  if (data.value) {
    const nav = data.value.settings?.navigation ?? defaultSiteNavigation;
    header.value = structuredClone(toRaw(nav.header));
    footer.value = structuredClone(toRaw(nav.footer));
  }
});

function newNavItem(): NavItem {
  return { id: crypto.randomUUID(), label: "", target: { kind: "route", route: "/" } };
}
function newColumn(): FooterColumn {
  return { id: crypto.randomUUID(), title: "", items: [] };
}

const updateMutation = useMutation({
  mutationFn: () => {
    const navigation: SiteNavigation = {
      header: header.value,
      footer: footer.value,
    };
    return $orpcClient.sites.update({ id: id.value, settings: { navigation } });
  },
  onSuccess: () => {
    toast.add({ title: "Сохранено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
  },
  onError: () => toast.add({ title: "Ошибка сохранения", color: "error" }),
});
</script>

<template>
  <PageContainer>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
      Загрузка…
    </div>

    <template v-else-if="data">
      <AppPageHeader
        title="Навигация"
        :back="`/sites/${id}/settings`"
        :crumbs="[
          { label: 'Сайты', to: '/sites' },
          { label: data.name ?? 'Сайт', to: `/sites/${id}/settings` },
          { label: 'Навигация' },
        ]"
      />

      <div class="max-w-3xl space-y-3">
        <AppDataCard title="Меню хедера" description="Пункты верхнего меню. У пункта-категории подменю собирается автоматически из её страниц.">
          <RepeaterField
            v-model="header"
            :default-item="newNavItem"
          >
            <template #item="{ item, update }">
              <div class="space-y-3">
                <UFormField label="Подпись" hint="пусто — возьмётся из страницы/раздела">
                  <UInput
                    :model-value="item.label"
                    placeholder="Напр. О компании"
                    size="sm"
                    @update:model-value="update('label', $event)"
                  />
                </UFormField>
                <UFormField label="Куда ведёт">
                  <NavTargetSelect
                    :model-value="item.target"
                    @update:model-value="update('target', $event)"
                  />
                </UFormField>
                <UFormField label="Подпункты (выпадашка)">
                  <RepeaterField
                    :model-value="item.children ?? []"
                    :default-item="newNavItem"
                    @update:model-value="update('children', $event)"
                  >
                    <template #item="{ item: child, update: updateChild }">
                      <div class="space-y-2">
                        <UInput
                          :model-value="child.label"
                          placeholder="Подпись подпункта"
                          size="sm"
                          @update:model-value="updateChild('label', $event)"
                        />
                        <NavTargetSelect
                          :model-value="child.target"
                          @update:model-value="updateChild('target', $event)"
                        />
                      </div>
                    </template>
                  </RepeaterField>
                </UFormField>
              </div>
            </template>
          </RepeaterField>
        </AppDataCard>

        <AppDataCard title="Колонки футера" description="Каждая колонка — заголовок и список ссылок. Число колонок = число записей здесь.">
          <RepeaterField
            v-model="footer"
            :default-item="newColumn"
          >
            <template #item="{ item: col, update: updateCol }">
              <div class="space-y-3">
                <UFormField label="Заголовок колонки">
                  <UInput
                    :model-value="col.title"
                    placeholder="Напр. Навигация"
                    size="sm"
                    @update:model-value="updateCol('title', $event)"
                  />
                </UFormField>
                <UFormField label="Ссылки">
                  <RepeaterField
                    :model-value="col.items"
                    :default-item="newNavItem"
                    @update:model-value="updateCol('items', $event)"
                  >
                    <template #item="{ item, update }">
                      <div class="space-y-2">
                        <UInput
                          :model-value="item.label"
                          placeholder="Подпись"
                          size="sm"
                          @update:model-value="update('label', $event)"
                        />
                        <NavTargetSelect
                          :model-value="item.target"
                          @update:model-value="update('target', $event)"
                        />
                      </div>
                    </template>
                  </RepeaterField>
                </UFormField>
              </div>
            </template>
          </RepeaterField>
        </AppDataCard>

        <div class="flex items-center gap-2 pt-1">
          <UButton
            color="primary"
            icon="i-solar-diskette-linear"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </UButton>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
```

> `RepeaterField` поддерживает `v-model` (defineModel `T[]`), `:default-item`, слот `#item="{ item, index, update }"` — см. `apps/admin/app/components/RepeaterField.vue` и использование в `AboutFeaturesBlock.vue`. Вложенные репитеры используют `:model-value` + `@update:model-value` (через `update(key, value)` родителя).

- [ ] **Step 2: Добавить ссылку в сайдбар**

В `apps/admin/app/components/AppSidebar.vue` внутри блока `<template v-if="isAdmin">` (после разделителя на строке 177, перед ссылкой SEO на строке 178) добавить пункт «Навигация»:

```html
<NuxtLink
  :to="`/sites/${site.id}/navigation`"
  class="flex items-center gap-2 px-2 py-1 rounded-md w-full text-left text-[12.5px] transition-colors"
  :class="isActive(`/sites/${site.id}/navigation`)
    ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted) font-medium'
    : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)'"
>
  <UIcon name="i-solar-list-linear" class="size-3.5 shrink-0 opacity-70" />
  <span>Навигация</span>
</NuxtLink>
```

- [ ] **Step 3: Собрать admin**

Run: `pnpm --filter admin build`
Expected: сборка проходит.

- [ ] **Step 4: Проверить редактор в браузере**

Запустить preview admin-стек, залогиниться (опереться на существующую сессию), открыть `/sites/<id>/navigation`:
- Добавить пункт хедера, выбрать каждый тип цели в `NavTargetSelect` (page/route/category/url/action) — поля переключаются, USelect не падает (нет пустых-строковых value).
- Добавить колонку футера со ссылками.
- Сохранить → тост «Сохранено».
- Перезагрузить страницу → данные подтянулись (round-trip).
- `preview_screenshot` — доказательство.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/app/pages/sites/[id]/navigation.vue apps/admin/app/components/AppSidebar.vue
git commit -m "feat(admin): редактор навигации сайта + ссылка в сайдбаре (#73)"
```

---

## Task 10: Ремап навигации в site-duplication

**Files:**
- Modify: `packages/api/src/services/site-duplication.ts:180-224`

- [ ] **Step 1: Импортировать ремап**

В `packages/api/src/services/site-duplication.ts` добавить импорт:

```ts
import { remapNavigationReferences } from "../shared/navigation";
```

- [ ] **Step 2: Захватить карту страниц**

Сейчас результат копирования страниц не сохраняется (строка 180: `await copyRows(tx, pages, ...)`). Изменить на присваивание, чтобы получить `pagesMap`:

```ts
const pagesMap = await copyRows(tx, pages, input.sourceSiteId, newSiteId, (row) => ({
  ...row,
  categoryId: row.categoryId
    ? (categoriesMap.get(row.categoryId) ?? null)
    : null,
  contentBlocks: remap(row.contentBlocks),
}));
```

- [ ] **Step 3: Ремапить навигацию в финальном апдейте settings**

В блоке «5. settings: ремап контакт-id» (строки 206-220), после ремапа `seo.organization.contactId` и перед `await tx.update(...)` (строка 221), добавить ремап навигации:

```ts
// navigation — ссылки на страницы/категории ремапим под новый сайт
if (newSettings.navigation) {
  newSettings.navigation = remapNavigationReferences(
    newSettings.navigation,
    pagesMap,
    categoriesMap,
  );
}
```

(`categoriesMap` уже существует — строка 153. `pagesMap` добавлен в Step 2.)

- [ ] **Step 4: Проверить типы и тесты**

Run: `pnpm check-types && pnpm test -- navigation site-duplication`
Expected: PASS (юнит-тесты ремапа из Task 2 покрывают чистую функцию; интеграция site-duplication — существующие тесты не ломаются).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/site-duplication.ts
git commit -m "feat(api): ремап навигации при дублировании сайта (#73)"
```

---

## Финальная проверка

- [ ] **Все тесты:** `pnpm test` — PASS.
- [ ] **Типы:** `pnpm check-types` — PASS.
- [ ] **E2E (preview-стек):** в админке настроить навигацию (пункты всех 5 типов + футер-колонки), сохранить; на web убедиться, что хедер и футер рендерят настроенное; дублировать сайт под город и проверить, что ссылки на страницы/категории не висячие (резолвятся в копии).
