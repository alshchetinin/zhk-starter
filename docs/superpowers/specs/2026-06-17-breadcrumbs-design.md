# Хлебные крошки: авто-режим + ручное переопределение

**Issue:** [#76](https://github.com/alshchetinin/zhk-starter/issues/76)
**Дата:** 2026-06-17
**Ветка:** `feat/76-breadcrumbs`

## Проблема

Хлебные крошки сейчас существуют только как JSON-LD (`buildBreadcrumbJsonLd` в
[`apps/web/app/utils/json-ld.ts`](../../../apps/web/app/utils/json-ld.ts)),
захардкоженные в `news/[slug].vue` и `projects/[id].vue`. Визуального компонента
на сайте нет, конфигурации тоже. Нужно:

1. **Авто-режим** — цепочка строится автоматически из структуры сайта.
2. **Ручное переопределение на любой странице** — редактор в админке может задать
   свою цепочку или скрыть крошки.
3. **Структурный рендер на web** — разметка прокинута, минимум стилей; финальную
   стилизацию делает разработчик отдельно для всех компонентов.

Приоритет — редактируемость в админке и готовая «обвязка», а не пиксели.

## Цели и не-цели

**Цели:**
- Единый источник данных крошек, питающий и визуальный рендер, и JSON-LD.
- Авто-цепочка для CMS-страниц (по категории), детальных (по роуту) и index-роутов.
- Per-page override (своя цепочка / скрыть) в редакторах pages, news, projects.
- Site-level настройки: включение, подпись «домой», показ на главной.

**Не-цели (YAGNI):**
- Отдельный центральный экран override по роутам — почти весь контент живёт в
  «Страницах», поле в редакторе закрывает потребность.
- Override для documents/promotions (только index-роуты, авто достаточно).
- Финальная стилизация компонента крошек (делается отдельно).
- Миграция существующих данных (новые поля получают default через jsonb-default).

## Архитектура

### Слой 1 — общая схема (`packages/api/src/shared/breadcrumbs.ts`)

Чистый модуль (только Zod, без node-зависимостей — безопасен для admin- и
web-бандла, как `shared/receivers` и `shared/blocks`). Единый source of truth для
БД, админки и web.

```ts
export const breadcrumbItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().optional(), // нет href → звено-текст без ссылки
});
export type BreadcrumbItem = z.infer<typeof breadcrumbItemSchema>;

export const breadcrumbsModeSchema = z.enum(["auto", "custom", "hidden"]);
export type BreadcrumbsMode = z.infer<typeof breadcrumbsModeSchema>;

export const breadcrumbsConfigSchema = z.object({
  mode: breadcrumbsModeSchema.default("auto"),
  items: z.array(breadcrumbItemSchema).default([]), // используется при mode === "custom"
});
export type BreadcrumbsConfig = z.infer<typeof breadcrumbsConfigSchema>;

export const defaultBreadcrumbsConfig: BreadcrumbsConfig = { mode: "auto", items: [] };
```

Site-level настройки добавляются в `SiteSettings` (`packages/db/src/schema/sites.ts`,
JSONB — **без миграции**):

```ts
export interface SiteBreadcrumbsSettings {
  /** undefined → включено */
  enabled?: boolean;
  /** undefined → «Главная» */
  homeLabel?: string;
  /** undefined → false (на главной крошки не показываем) */
  showOnHome?: boolean;
}
// SiteSettings.breadcrumbs?: SiteBreadcrumbsSettings
```

### Слой 2 — БД (`packages/db`)

Новая колонка на таблицах, у которых есть рендерящаяся web-страница:

```ts
breadcrumbs: jsonb("breadcrumbs")
  .$type<BreadcrumbsConfig>()
  .notNull()
  .default({ mode: "auto", items: [] }),
```

Добавляется в: `pages`, `news`, `projects`. Documents/promotions — только
index-роуты, остаются на авто (колонку не добавляем).

Drizzle-миграция: три `ALTER TABLE ... ADD COLUMN breadcrumbs jsonb NOT NULL
DEFAULT '{"mode":"auto","items":[]}'`. Тип `BreadcrumbsConfig` импортируется в
схему из `@zhk/api/shared/breadcrumbs` (как `ContentBlock` уже импортируется в
`pages.ts`).

### Слой 3 — публичный API

- `public.pages.getBySlug` — добавить `with: { category: { columns: { title: true } } }`,
  чтобы вернуть `category.title` для авто-режима по категории. Поле `breadcrumbs`
  вернётся автоматически (читаем всю строку).
- `public.news.getBySlug`, `public.projects.getById` — `breadcrumbs` вернётся
  автоматически (полная строка). Доп. изменений не требуют.

### Слой 4 — web (рендер + авто-движок)

**Чистый билдер** `apps/web/app/utils/breadcrumbs.ts` — без Vue/Nuxt, юнит-тестируемый:

```ts
interface AutoContext {
  /** Текущая страница (последнее звено, без ссылки) */
  current: string;
  /** Промежуточное звено (раздел/категория); href опц. */
  parent?: BreadcrumbItem;
}
interface ResolveInput {
  config?: BreadcrumbsConfig;          // override записи; undefined → auto
  auto: AutoContext;
  settings?: SiteBreadcrumbsSettings;
  isHome?: boolean;
}
function resolveBreadcrumbs(input: ResolveInput): BreadcrumbItem[] | null;
```

Логика `resolveBreadcrumbs`:
1. `settings.enabled === false` → `null`.
2. `isHome && !settings.showOnHome` → `null`.
3. `config.mode === "hidden"` → `null`.
4. `config.mode === "custom"` и `items.length > 0` → `[home, ...config.items]`.
   - При пустом `items` → деградация в auto (п.5).
5. **auto**: `[home, parent?, current]` (parent опускается, если не задан).
6. `home` = `{ label: settings.homeLabel ?? "Главная", href: "/" }`.

Текущее звено (`current`) рендерится без ссылки (последний crumb).

**Composable** `apps/web/app/composables/useBreadcrumbs.ts`:

```ts
function useBreadcrumbs(input: MaybeRefOrGetter<{
  current: string;
  parent?: BreadcrumbItem;
  config?: BreadcrumbsConfig;
  isHome?: boolean;
}>): void
```

Каждая страница вызывает в setup; composable читает `useSiteGate()` для
`settings.breadcrumbs`, прогоняет через `resolveBreadcrumbs`, пишет итог в
`useState<BreadcrumbItem[] | null>("breadcrumbs")`. Реактивно (getter), как
`usePageSeo`. На unmount/смене роута перезаписывается следующей страницей; для
страниц без вызова — сбрасываем в `null` (см. ниже про сброс).

**Контексты по роутам:**

| Роут | current | parent | config |
|------|---------|--------|--------|
| `/[...slug]` (CMS) | `page.title` | `category.title` → `{ label }` (без ссылки) | `page.breadcrumbs` |
| `news/[slug]` | `item.title` | `{ label: "Новости", href: "/news" }` | `item.breadcrumbs` |
| `projects/[id]` | `item.name` | `{ label: "Проекты", href: "/projects" }` | `item.breadcrumbs` |
| `news/index` | `"Новости"` | — | — (auto) |
| `projects/index` | `"Проекты"` | — | — (auto) |
| `documents/index` | `"Документы"` | — | — (auto) |
| `promotions/index` | `"Акции"` | — | — (auto) |
| `/` (home) | — | — | `isHome: true` |

**Компонент** `apps/web/app/components/WebBreadcrumbs.vue` — монтируется в
`layouts/default.vue` в начало `<main>`:
- Читает `useState("breadcrumbs")`; если `null` — ничего не рендерит.
- **Структурная разметка** (минимум стилей, CSS-токены `var(--web-*)`, разработчик
  доводит позже):
  ```html
  <nav aria-label="Хлебные крошки" class="breadcrumbs">
    <ol>
      <li v-for="..."> <NuxtLink v-if="item.href" .../> <span v-else>...</span> </li>
    </ol>
  </nav>
  ```
- Он же вызывает `useJsonLd(() => buildBreadcrumbJsonLd(absolutizedItems))` —
  **единый источник** для визуала и SEO. Абсолютизация href через
  `useRequestURL().origin` (как в текущих страницах).

**Удаляем** захардкоженные `buildBreadcrumbJsonLd(...)` из `news/[slug].vue` и
`projects/[id].vue` — теперь крошки централизованы.

**Сброс между роутами:** в `layouts/default.vue` ставим `watch(() => route.fullPath, () => { breadcrumbs.value = null }, { flush: "pre" })`. На смене пути state обнуляется до того, как setup новой страницы выставит своё значение через `useBreadcrumbs`. Страницы без вызова composable (если появятся) корректно показывают пустые крошки, а не унаследованные от предыдущего роута.

### Слой 5 — админка

**Переиспользуемый `BreadcrumbsField.vue`** (`apps/admin/app/components`):
- `defineModel<BreadcrumbsConfig>({ required: true })` + `set()` helper.
- `USelect` режим: Авто / Своя цепочка / Скрыть.
- При «Своя цепочка» — редактор списка звеньев на базе `RepeaterField`
  (поля: `label` UInput, `href` UInput-опц.; реордер, add/remove).
- Только `@nuxt/ui`, без собственных обёрток.

**Места вставки:**
- `apps/admin/app/pages/pages/[id].vue` + `pages/create.vue` (в `form.breadcrumbs`).
- `apps/admin/app/pages/news/[id].vue` — `form.breadcrumbs`.
- `apps/admin/app/pages/projects/[id]/edit.vue` — `form.breadcrumbs`.

**Карточка «Хлебные крошки»** на странице `apps/admin/app/pages/sites/[id]/seo.vue`
(рядом с карточкой «SEO», тот же паттерн — крошки питают `BreadcrumbList` JSON-LD):
`USwitch` enabled, `UInput` homeLabel (плейсхолдер «Главная»), `USwitch` showOnHome.
Пишет в `sites.settings.breadcrumbs`.

oRPC: отдельные процедуры не нужны — `breadcrumbs` едет в существующих
`pages.update`/`create`, `news.update`, `projects.update`; site-настройки — в
существующем апдейте `sites`. Серверная валидация — `breadcrumbsConfigSchema` в
input-схемах этих процедур.

## Поток данных

```
Admin editor (BreadcrumbsField) ──update──▶ DB pages/news/projects.breadcrumbs (jsonb)
Admin site settings (карточка)  ──update──▶ DB sites.settings.breadcrumbs (jsonb)
                                                      │
public.*.getBySlug/getById ◀─────────────────────────┘ (+ pages: join category.title)
        │
        ▼
page setup → useBreadcrumbs({ current, parent, config, isHome })
        │  + useSiteGate().settings.breadcrumbs
        ▼
resolveBreadcrumbs() ──▶ useState("breadcrumbs")
        │
        ▼
WebBreadcrumbs.vue (layout) ──▶ визуальный <nav> + useJsonLd(buildBreadcrumbJsonLd)
```

## Граничные случаи

- Глобально выключено (`enabled === false`) → ни рендера, ни JSON-LD.
- `mode: "hidden"` на странице → ни рендера, ни JSON-LD.
- Главная при `showOnHome !== true` → ничего.
- `mode: "custom"` с пустым `items` → деградация в auto (а не пустая панель).
- CMS-страница без категории → `Главная → Заголовок` (без среднего звена).
- Locked/inactive сайт → layout показывает gate, `<main>`/крошки не рендерятся.
- Звено `parent` без `href` (категория) → рендерится как `<span>`, не ссылка.

## Тестирование

- **Юнит** (`apps/web/app/utils/__tests__/breadcrumbs.test.ts`): `resolveBreadcrumbs`
  — auto с/без parent, custom, custom-пустой→auto, hidden, disabled, isHome×showOnHome,
  кастомный homeLabel.
- **Юнит** (`packages/api/src/shared/__tests__/breadcrumbs.test.ts`):
  `breadcrumbsConfigSchema` — дефолты, валидация items, отбраковка пустого label.
- Расширить `apps/web/app/utils/__tests__/json-ld.test.ts` при изменениях
  `buildBreadcrumbJsonLd` (если потребуются — сигнатура не меняется).
- `pnpm check-types` без новых ошибок (NB: Vue SFC не проверяются типами в репо —
  admin/web слой валидируется вручную/через vue-tsc по `.nuxt` tsconfig).

## Файлы

**Новые:**
- `packages/api/src/shared/breadcrumbs.ts`
- `packages/api/src/shared/__tests__/breadcrumbs.test.ts`
- `apps/web/app/utils/breadcrumbs.ts`
- `apps/web/app/utils/__tests__/breadcrumbs.test.ts`
- `apps/web/app/composables/useBreadcrumbs.ts`
- `apps/web/app/components/WebBreadcrumbs.vue`
- `apps/admin/app/components/BreadcrumbsField.vue`
- Drizzle-миграция (генерируется)

**Изменяемые:**
- `packages/db/src/schema/sites.ts` (тип `SiteBreadcrumbsSettings` + `SiteSettings`)
- `packages/db/src/schema/pages.ts`, `news.ts`, `projects.ts` (колонка `breadcrumbs`)
- `packages/api/src/routers/public/pages.ts` (join category)
- `packages/api/src/routers/.../{pages,news,projects}.*` (input-схема breadcrumbs)
- `apps/web/app/layouts/default.vue` (монтаж + сброс state)
- `apps/web/app/pages/{[...slug],news/[slug],projects/[id],news/index,projects/index,documents/index,promotions/index,index}.vue`
- `apps/admin/app/pages/{pages/[id],pages/create,news/[id],projects/[id]/edit}.vue` (поле `BreadcrumbsField`)
- `apps/admin/app/pages/sites/[id]/seo.vue` (карточка «Хлебные крошки»)
