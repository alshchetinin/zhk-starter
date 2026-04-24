# ZHK Starter — Инструкции для AI

## Архитектура

Turborepo монорепо:
- `apps/admin` — Nuxt 4 SPA, @nuxt/ui v4, порт 3002
- `apps/web` — Nuxt 4 SSR, reka-ui + Tailwind, порт 3001
- `apps/server` — Hono HTTP, порт 3000
- `packages/api` — oRPC роутер + Zod схемы
- `packages/db` — Drizzle ORM + PostgreSQL

## Блочная система

Блоки — типизированные секции контента. Хранятся как JSONB в БД, редактируются в админке, рендерятся на сайте.

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
  "icon": "i-tabler-icon-name",
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

### Генератор создаёт 3 файла

1. `packages/api/src/shared/blocks/{type}.ts` — `defineBlock({ type, label, icon, description, category?, dataSchema, defaultData })` — единый source of truth: Zod-схема, метаданные для picker, default data. Плюс добавляется в `allBlocks` массив в `blocks/index.ts`.
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
- Иконки: `i-tabler-*`

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
