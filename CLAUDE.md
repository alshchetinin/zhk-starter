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

### Генератор создаёт 6 файлов

1. `packages/api/src/shared/blocks.ts` — Zod-схема + union member + blockDefinition
2. `apps/admin/.../editors/{Name}Block.vue` — редактор
3. `apps/admin/.../editors/index.ts` — регистрация редактора
4. `apps/admin/.../BlockDynamicZone.vue` — default data
5. `apps/web/.../renderers/{Name}Block.vue` — рендерер (stub)
6. `apps/web/.../renderers/index.ts` — регистрация рендерера

### После генератора — доработать web renderer

Генератор создаёт stub renderer (`<pre>{{ $props }}</pre>`). Нужно заменить на вёрстку по прототипу.

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

## Workflow: PNG → блок

1. Пользователь кладёт PNG в `design/blocks/` (kebab-case.png)
2. AI читает PNG, определяет поля и типы
3. AI предлагает структуру — ждёт подтверждения
4. AI создаёт `design/blocks/{name}.json`
5. AI запускает `pnpm generate:block --config design/blocks/{name}.json`
6. AI дорабатывает web renderer по прототипу
