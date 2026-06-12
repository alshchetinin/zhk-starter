# ZHK Starter — Инструкции для AI

## Архитектура

Turborepo монорепо:
- `apps/admin` — Nuxt 4 SPA, @nuxt/ui v4, порт 3002
- `apps/web` — Nuxt 4 SSR, reka-ui + Tailwind, порт 3001
- `apps/server` — Hono HTTP, порт 3000
- `packages/api` — oRPC роутер + Zod схемы
- `packages/db` — Drizzle ORM + PostgreSQL

## Трекинг и аналитика

Per-site Яндекс.Метрика + универсальный bus событий `useTracking()`.
Реестр событий — `packages/api/src/shared/tracking.ts` (одна правка → новое
событие появляется в TS-типах, в админской таблице и в dev-логах). Провайдеры
аналитики — массив в `apps/web/app/utils/tracking-providers.ts` (Метрика
сейчас, GA/GTM добавляются туда же без правки блоков).

Подробности и инструкции по добавлению событий/провайдеров: [`docs/tracking.md`](docs/tracking.md).

## UI в admin: только @nuxt/ui

В `apps/admin` всегда используем готовые компоненты из `@nuxt/ui` v4
(`UButton`, `UInput`, `USelect`, `UModal`, `UTable`, `UFormField` и т.д.).
**Не создавать собственные обёртки/копии** того, что уже есть в @nuxt/ui.

- Внешний вид настраивается централизованно в `apps/admin/app/app.config.ts`
  через `ui.<component>.defaultVariants` и `ui.<component>.slots`.
- Если нужно что-то непохожее на стандартный @nuxt/ui — сначала пробуем
  настроить через `app.config.ts` или `:ui` prop, и только если совсем
  не получается — обёртка с осознанным обоснованием.
- Линейные тонкие компоненты-композиции (например, `AppPageHeader`,
  `AppDataCard`, `AppStatusPill`, `AppEmptyState`, `AppStatHero`) — это
  layout-примитивы, а не замена стандартных интерактивных компонентов.

## Блочная система

Блоки — типизированные секции контента. Хранятся как JSONB в БД, редактируются в админке, рендерятся на сайте.

Подробное руководство (архитектура слоёв, типы полей, round-trip, кастомизация): [docs/blocks.md](docs/blocks.md).

### Создание блока через CLI

```bash
# Интерактивный режим
pnpm generate:block

# Неинтерактивный режим (для AI)
pnpm generate:block --config design/blocks/block-name.json
```

JSON конфиг (`BlockInfo`):
```json
{
  "name": "block-name",
  "label": "Название блока",
  "description": "Описание для админки",
  "icon": "i-solar-icon-name-linear",
  "fields": [
    { "name": "fieldName", "type": "string", "label": "Поле", "required": true },
    { "name": "optField", "type": "text", "label": "Опциональное", "required": false, "description": "Подсказка" },
    { "name": "size", "type": "select", "label": "Размер", "required": true, "options": ["small", "medium", "large"] },
    {
      "name": "items", "type": "repeater", "label": "Элементы", "required": true,
      "minItems": 2, "maxItems": 6,
      "subFields": [
        { "name": "title", "type": "string", "label": "Заголовок", "required": true },
        { "name": "image", "type": "image", "label": "Картинка", "required": true }
      ]
    }
  ]
}
```

Типы полей: `string`, `text`, `richtext`, `number`, `boolean`, `url`,
`image`, `images`, `strings` (массив строк), `select`, `repeater`.

### Dev-билдер блоков (/dev/blocks)

В dev-режиме админки есть раздел «Разработка → Блоки»: создание, удаление и
**редактирование схемы полей** существующих блоков (как Strapi content-type
builder). Изменения пишутся в исходники (определение + admin-редактор),
Vite HMR подхватывает. Web-рендерер при редактировании полей не трогается —
вёрстку под новые поля добавлять руками.

- Определение блока и admin-редактор — **генерируемые артефакты**: ручные
  правки в них перезапишутся при сохранении из UI. Idempotency-тест
  (`scripts/generate-block/__tests__/`) держит файлы определений байт-в-байт
  равными канонической эмиссии генератора.
- У блоков с кастомными admin-редакторами (например, ProjectSelector в
  project-блоках, выбор контактов в contacts) сохранение схемы из UI заменит
  кастомный редактор на канонический шаблон — правки восстанавливаются
  через git.
- `defineBlock` содержит декларативный `fields: BlockField[]` (включая
  `default` для значений, отличных от канонических) — единый source of truth
  для билдера, генератора и форм; consistency-тесты
  (`packages/api/src/shared/blocks/__tests__/`) следят, что fields совпадают
  с dataSchema/defaultData.
- Данные контента в БД не мигрируются: при загрузке блок мержится с
  defaultData (`normalizeBlockData`), новые поля получают default.

**Кастомизация редакторов.** Сам editor-SFC — генерируемый артефакт, руками его
не дорабатываем. Кастомные доработки живут в слоях, которые генератор не трогает:
компоненты типов полей (`ProjectSelector`, `ContactsSelector`, `TagInput`, ...)
и live-превью `blocks/previews/{PascalCase}BlockPreview.vue` — компонент с таким
именем авторегистрируется и рендерится под формой редактора блока, получая
нормализованные данные через prop `data`.

### Превью блока в пикере

PNG-скриншот блока кладётся в `apps/admin/public/block-previews/{type}.png`
(руками или загрузкой на странице `/dev/blocks/{type}`) и коммитится в git.
Пикер и список блоков показывают картинку, при её отсутствии — иконку.

### Генератор создаёт 3 файла

1. `packages/api/src/shared/blocks/{type}.ts` — `defineBlock({ type, label, icon, description, category?, fields, dataSchema, defaultData })` — единый source of truth: Zod-схема, метаданные для picker, default data. Плюс добавляется в `allBlocks` массив в `blocks/index.ts`.
2. `apps/admin/.../editors/{Name}Block.vue` — редактор (авто-регистрируется через `import.meta.glob` по имени файла `{PascalCase}Block.vue` → `{kebab-case}` тип)
3. `apps/web/.../renderers/{Name}Block.vue` — рендерер (stub, авто-регистрация аналогично)

Никакие реестры и default data руками править не нужно — всё собирается автоматически.

### После генератора — доработать web renderer

Генератор создаёт stub renderer (`<pre>{{ $props }}</pre>`). Нужно заменить на вёрстку по прототипу.

### Удаление блока

Удалить 3 файла: `blocks/{type}.ts`, admin editor, web renderer. Убрать импорт/entry из `blocks/index.ts`. Всё.

## Паттерны кода

### Admin editor
- `defineModel<{...}>({ required: true })` + `set()` helper
- UI: `@nuxt/ui` — UInput, UTextarea, UEditor, USelect, USwitch, ImageUpload, GalleryUpload, RepeaterField
- Иконки: Solar linear — `i-solar-*-linear` (например `i-solar-home-linear`). Коллекция `@iconify-json/solar`. Несколько устаревших исключений на Tabler там, где у Solar нет аналога (`crane`, `blockquote`, `h-1/h-2/h-3`, `baby-carriage`)

### Web renderer
- `defineProps<{...}>()`
- Обёртка: `<div class="section"><div class="container-web">...</div></div>`
- CSS-токены: `var(--web-text-primary)`, `var(--web-accent)`, `var(--web-bg-muted)`, `var(--web-border)`
- Иконки: `lucide:*` через `<Icon name="lucide:...">`
- Richtext: `v-html` + `class="prose-web"`

### Admin data-fetching (vue-query + oRPC)

QueryClient в [apps/admin/app/plugins/vue-query.ts](apps/admin/app/plugins/vue-query.ts): staleTime 1 мин, gcTime 7 дн, persist в IndexedDB через idb-keyval. При несовместимости зависимостей — поднять `buster` в `persistQueryClient`, чтобы очистить старый кеш у пользователей.

**Страница-список (`*/index.vue`):**
- `placeholderData: keepPreviousData` в `useQuery` — нет мигания при пагинации/фильтрах
- `@mouseenter` на строке вызывает `queryClient.prefetchQuery($orpc.<entity>.getById.queryOptions({input: {id}}))` — клик по строке открывает деталь мгновенно
- Delete mutation — optimistic: в `onMutate` снять снапшот через `getQueriesData({queryKey: $orpc.<entity>.list.key()})`, отфильтровать `data` и уменьшить `total`, в `onError` откатить из снапшота, в `onSettled` — `invalidateQueries`

**Страница-деталь (`*/[id].vue`) и edit-форма:**
- Update mutation — optimistic: `setQueryData` на `$orpc.<entity>.getById.queryKey({input: {id}})` с новыми значениями формы, rollback в `onError`, `invalidateQueries` в `onSettled`
- Тосты показываем в `onSuccess`, не в `onMutate` — чтобы не врать пользователю при ошибке

**Ключи oRPC:**
- `.key()` — partial match, для `invalidateQueries` / `setQueriesData` по всему роутеру сущности
- `.queryKey({input})` — full match, для точечного `setQueryData` на конкретный `getById`

Примеры реализации: [pages/index.vue](apps/admin/app/pages/pages/index.vue), [pages/[id].vue](apps/admin/app/pages/pages/[id].vue), [projects/[id]/edit.vue](apps/admin/app/pages/projects/[id]/edit.vue).

## Ручное создание сущностей недвижимости

CRUD через UI доступен для: projects, buildings, sections, apartment-layouts, apartments, commerce, parking, storage.

- **Ручные vs импорт**: `integrationId = null` — создано в UI, `integrationId != null` — из Profitbase/Macro sync.
- **Sync перезаписывает импортированные записи**. UI показывает badge «Импорт» и warning-алерт на записях с `integrationId`.
- **Каскадные удаления**: Project → Buildings → Sections → Floors → Apartments + Commerce/Parking/Storage. Project и Building каскадят вниз; Section — floors+apartments; листья — напрямую.
- **Общий компонент для нежилых**: [NonResidentialList](apps/admin/app/components/NonResidentialList.vue) используется в страницах commerce/parking/storage с параметрами `kind`, `title`, `withCategory`.

## Workflow: PNG → блок

1. Пользователь кладёт PNG в `design/blocks/` (kebab-case.png)
2. AI читает PNG, определяет поля и типы
3. AI предлагает структуру — ждёт подтверждения
4. AI создаёт `design/blocks/{name}.json`
5. AI запускает `pnpm generate:block --config design/blocks/{name}.json`
6. AI дорабатывает web renderer по прототипу
