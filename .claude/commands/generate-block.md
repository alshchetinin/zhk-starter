# generate-block

Генерация блоков контента из PNG-прототипов.

## Workflow

### Шаг 1: Сканирование `design/blocks/`

Найди все PNG/JPG файлы в `design/blocks/` для которых ещё НЕТ соответствующего JSON конфига (т.е. `hero.png` есть, а `hero.json` нет = новый блок).

Если новых PNG нет — сообщи пользователю: "Нет новых прототипов в design/blocks/".

### Шаг 2: Анализ каждого нового PNG

Для каждого нового PNG:
1. Прочитай изображение через Read tool
2. Определи: какие данные отображаются, какие поля нужны, есть ли repeater
3. Определи имя блока из имени файла (kebab-case, без расширения)

### Шаг 3: Вопрос по каждому блоку

Для КАЖДОГО блока выведи предложение в формате:

```
### hero.png → Блок "hero"
Label: Главный баннер
Поля:
  - title (string, обязательное) — Заголовок
  - description (text, опционально) — Описание
  - images (images, обязательное) — Фоновые изображения
  - primaryButtonText (string) — Текст кнопки
  - primaryButtonUrl (url) — Ссылка кнопки

Что изменить/добавить?
```

**ОБЯЗАТЕЛЬНО дождись подтверждения или правок от пользователя** по ВСЕМ блокам перед генерацией. Пользователь может дополнить, убрать или переименовать любое поле.

### Шаг 4: Генерация

После подтверждения для каждого блока:
1. Создай JSON конфиг `design/blocks/{name}.json`
2. Запусти `pnpm generate:block --config design/blocks/{name}.json`
3. Доработай web-рендерер по прототипу (используй frontend-design и motion скиллы)

### Шаг 5: Проверка

Запусти `pnpm dev:web` — убедись что компилируется без ошибок.

---

## JSON конфиг (BlockInfo)

```json
{
  "name": "block-name",
  "label": "Название блока",
  "description": "Описание для админки",
  "icon": "i-tabler-icon-name",
  "fields": [
    { "name": "fieldName", "type": "string", "label": "Поле", "required": true },
    { "name": "optField", "type": "text", "label": "Опциональное", "required": false },
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

## Доступные типы полей

| Тип | Описание | TS тип |
|-----|----------|--------|
| `string` | Строка | `string` |
| `text` | Многострочный текст | `string` |
| `richtext` | Rich text (HTML) | `string` |
| `number` | Число | `number` |
| `boolean` | Переключатель | `boolean` |
| `url` | URL ссылка | `string` |
| `image` | Изображение (URL) | `string \| null` |
| `images` | Галерея (массив URL) | `string[]` |
| `select` | Выбор из списка | `string` |
| `repeater` | Повторяемый блок | `Array<{...}>` |

## Правила вёрстки рендерера

- Обёртка: `<div class="section"><div class="container-web">...</div></div>`
- CSS-токены: `var(--web-accent)`, `var(--web-text-primary)`, `var(--web-bg-muted)`, `var(--web-border)`
- UI компоненты: `<UiButton>`, `<UiCard>`, `<UiTabs>`, `<UiBadge>`, `<UiDialog>`, `<UiAccordion>`, `<UiAvatar>`, `<UiSeparator>`
- Анимации: `useMotionPresets()` → fadeUp, stagger, scaleIn. Паттерн: `<Motion as="div" v-bind="fadeUp">`
- Stagger для списков: `<Motion :variants="staggerContainer">` + `<Motion :variants="staggerChild">`
- Иконки: `<Icon name="lucide:...">`
- Richtext: `v-html` + `class="prose-web"`
- Используй скилл `frontend-design` для качественного дизайна
- Используй скилл `motion` для анимаций
