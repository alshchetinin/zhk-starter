# Категории страниц вместо привязки к проектам

**Issue:** [#63](https://github.com/alshchetinin/zhk-starter/issues/63)
**Дата:** 2026-06-13
**Статус:** дизайн

## Проблема

К странице (`pages`) сейчас крепится `projectId` (FK → `projects`, nullable, `onDelete: set null`).
На вебе эта связь **нигде не используется** — страница рендерится по slug, принадлежность
к проекту на фронте ни на что не влияет. Это чисто админский органайзер:

- бейдж проекта в списке страниц ([pages/index.vue](../../../apps/admin/app/pages/pages/index.vue));
- фильтр `projectId` в `pages.list`;
- вкладка «На сайте» в проекте ([projects/[id]/website.vue](../../../apps/admin/app/pages/projects/[id]/website.vue)),
  которая показывает страницы этого проекта и даёт ярлык «создать страницу для проекта».

Принадлежность к проекту фактически живёт **в блоках страницы** (поле типа `project`),
поэтому page-level `projectId` избыточен и ограничивает: нельзя сгруппировать страницы
иначе, чем по проектам (например «Способы покупки», «Второстепенные»).

## Цель

Заменить жёсткую связь страница→проект на гибкие **категории страниц** — управляемую
таксономию для группировки и фильтрации страниц в админке. Все страницы сайта
создаются в одном разделе «Страницы» и раскладываются по категориям.

## Не-цели (вне скоупа)

- **Веб не трогаем.** Категории — админский органайзер. Вынос на фронт (меню,
  группировки) — позже по необходимости (YAGNI).
- **Миграции данных нет.** `projectId` просто дропается — реальных данных нет, приложение
  в разработке.
- **Сущность `purchase_methods` не трогаем.** Категория «Способы покупки» — это просто
  use-case (можно создать страницу с такой категорией), а не миграция таблицы способов покупки.

## Принятые решения

| Вопрос | Решение |
| --- | --- |
| Модель категорий | Отдельная first-class сущность с CRUD (таблица `page_categories`) |
| Кардинальность | Одна категория на страницу (простой FK `pages.categoryId`) |
| Судьба `projectId` | Дроп колонки, без миграции данных |
| Управление категориями | Модалка из шапки списка страниц (без отдельного пункта сайдбара) |
| Стартовые данные | Сид 3 дефолтных категорий: «Проекты», «Способы покупки», «Второстепенные» |

## Модель данных

### Новая таблица `page_categories`

`packages/db/src/schema/page-categories.ts`:

```ts
export const pageCategories = pgTable("page_categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id").notNull().default("default").references(() => sites.id),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  color: text("color"), // опционально — для различимых бейджей
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const pageCategoriesRelations = relations(pageCategories, ({ one, many }) => ({
  site: one(sites, { fields: [pageCategories.siteId], references: [sites.id] }),
  pages: many(pages),
}));
```

- Регистрация в `packages/db/src/schema/index.ts` (`export * from "./page-categories"`).
- `color` — необязательное поле; если решим не нужно на этапе реализации, выкидываем.

### Правка `pages`

`packages/db/src/schema/pages.ts`:

- **Убрать** колонку `projectId` и `pagesRelations.project`.
- **Добавить** `categoryId: text("category_id").references(() => pageCategories.id, { onDelete: "set null" })`
  и `pagesRelations.category`.

### Правка `projects`

`packages/db/src/schema/projects.ts`:

- **Убрать** relation `pages: many(pages)` (строка ~69) и импорт `pages`, если он больше не нужен.

### Применение схемы

`pnpm --filter @zhk/db db:push` (drizzle-kit push) — дропает `pages.project_id`,
создаёт `page_categories` и `pages.category_id`. Отдельной SQL-миграции не пишем
(проект использует `db:push`).

## API

### Новый роутер `pageCategories`

`packages/api/src/routers/page-categories.ts` — по образцу простых CRUD-сущностей
(`siteProcedure`, скоуп по `context.siteId`):

- `list` — все категории сайта, `orderBy sortOrder asc, title asc`. Возвращает счётчик
  страниц на категорию (для модалки управления — показать «N страниц» и предупредить
  при удалении). Счётчик — отдельный `db.select count` с `groupBy categoryId` или
  подзапрос; реализацию выбрать при имплементации.
- `create` — `{ title, sortOrder?, color? }`.
- `update` — `{ id, title?, sortOrder?, color? }`.
- `delete` — `{ id }`. FK `onDelete: set null` обнулит `categoryId` у связанных страниц
  (страницы не удаляются).

Регистрация: `import` + entry `pageCategories: pageCategoriesRouter` в
`packages/api/src/routers/index.ts`.

### Правки `pages` роутера

`packages/api/src/routers/pages.ts`:

- `list`: фильтр `projectId` → `categoryId` (`z.string().optional()`,
  условие `eq(pages.categoryId, categoryId)`); `with: { project }` → `with: { category }`.
- `getById`: `with: { project }` → `with: { category }`.
- `create` / `update`: поле `projectId` → `categoryId` (`z.string().nullable().optional()`),
  присвоение в insert/update.

### Правки публичного роутера

`packages/api/src/routers/public/pages.ts`:

- В `list` и `getBySlug` **убрать** `with: { project: ... }` (вебу категории не нужны).

## Admin UI

### Композабл

`apps/admin/app/composables/useCategoryOptions.ts` (по образцу `useProjectOptions.ts`):
`useCategoryOptions()` → `{ options }` для `USelect` (с пунктом «Без категории» = `CATEGORY_NONE`),
экспорт константы `CATEGORY_NONE = "_none"`. Старый `useProjectOptions`/`PROJECT_NONE`
в страницах остаётся для других экранов — удаляем только использование в редакторе страниц.

### Список страниц — [pages/index.vue](../../../apps/admin/app/pages/pages/index.vue)

- Фильтр-`USelect` по категории рядом с фильтром статуса (`categoryFilter`, прокидывается
  в `pages.list` как `categoryId`).
- Бейдж проекта в строке (`item.project`) → бейдж категории (`item.category.title`,
  опц. цвет).
- Кнопка **«Категории»** в `AppPageHeader #actions` открывает `UModal` управления.

### Модалка управления категориями

Новый компонент `apps/admin/app/components/PageCategoriesModal.vue`:

- Список категорий (`pageCategories.list`), inline-редактирование title, изменение порядка
  (стрелки вверх/вниз или drag — выбрать проще; через `sortOrder`), удаление с
  подтверждением (показать «N страниц потеряют категорию»).
- Создание новой категории (поле + кнопка).
- Все мутации — vue-query, инвалидация `pageCategories.key()` и `pages.key()`
  (бейджи в списке зависят от названий).

### Редактор страницы — [create.vue](../../../apps/admin/app/pages/pages/create.vue) + [[id].vue](../../../apps/admin/app/pages/pages/[id].vue)

- В сайдбаре `UFormField "Проект"` → `UFormField "Категория"` с `USelect`
  (`form.categoryId`, плейсхолдер «Без категории»).
- Inline-создание категории прямо из селекта («+ создать категорию» → маленький prompt/инпут,
  создаёт через `pageCategories.create`, выбирает созданную). Если inline-создание усложняет —
  fallback: ссылка «управлять категориями» открывает ту же модалку.
- В `create.vue` убрать чтение `route.query.projectId` (ярлыка из проекта больше нет).
- Заменить `projectId`/`PROJECT_NONE` на `categoryId`/`CATEGORY_NONE` в `form`, в
  optimistic-апдейтах и в вызовах мутаций.

## Зачистка связи с проектом

- **Вкладка «На сайте» в проекте:** удалить пункт `{ label: "На сайте", to: ".../website" }`
  из `tabs` в [projects/[id].vue:40](../../../apps/admin/app/pages/projects/[id].vue:40), поправить индексы
  в `activeTabIdx` (строки 45-54), удалить файл
  [projects/[id]/website.vue](../../../apps/admin/app/pages/projects/[id]/website.vue) и его роут
  `/projects/[id]/website`.
- Проверить, что после удаления `projectId` не осталось мёртвых ссылок на `page.project`
  (grep по `apps/admin`, `apps/web`, `packages/api`).

## Сиды

3 дефолтные категории «Проекты», «Способы покупки», «Второстепенные» (`sortOrder` 0/1/2)
для сайта `default`. **Готового seed-механизма в `packages/db` нет** (есть только SQL-миграции
в `src/migrations`, основной флоу — `db:push`). Поэтому добавляем минимальный
идемпотентный seed-скрипт:

- `packages/db/src/seed.ts` — вставляет 3 категории, если у сайта `default` их ещё нет
  (проверка по `siteId` + `title`, чтобы повторный запуск не плодил дубли);
- npm-скрипт `"db:seed": "tsx src/seed.ts"` (или аналог раннера, как в остальных скриптах
  пакета) в `packages/db/package.json`.

Категории остаются редактируемыми/удаляемыми из админки.

## Тестирование

CRUD-роутеры в репозитории **юнит-тестами не покрыты** (существующие тесты — только для
middleware и blocks-логики: `rate-limit.test.ts`, `blocks.test.ts`, `blocks-schema.test.ts`).
Поэтому новых тестов роутера не вводим, чтобы не плодить разнородный паттерн. Верификация:

- `pnpm typecheck` / сборка — типы oRPC + Drizzle ловят рассинхрон схемы и роутеров.
- Ручная проверка в админке: создать/переименовать/удалить категорию в модалке (включая
  предупреждение «N страниц потеряют категорию»), назначить категорию странице, отфильтровать
  список по категории, inline-создание из редактора, удаление категории не удаляет страницы
  (а обнуляет `categoryId`).
- Опционально (если посчитаем ценным при имплементации): один точечный тест на поведение
  `delete` → `set null`.

## Возможные расширения (на будущее, не сейчас)

- Вынос категорий на веб (группировка пунктов меню, страницы-разделы).
- `slug` у категории (если появятся web-роуты по категориям).
- Many-to-many (страница в нескольких категориях) — если файлинг по одной категории
  окажется тесным.
