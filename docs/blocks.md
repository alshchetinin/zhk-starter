# Блочная система

Блок — типизированная секция контента. Экземпляры блоков (`{ id, type, data }`)
хранятся как JSONB в БД (колонка `contentBlocks` / `content_blocks` у
страниц/коллекций), редактируются в
админке через `BlockDynamicZone`, рендерятся на сайте через `BlockRenderer`.
Схема каждого типа блока живёт в коде и редактируется либо через dev-билдер
`/dev/blocks` (как content-type builder в Strapi), либо через CLI-генератор.

## TL;DR

Два входа в одну и ту же кодогенерацию:

- **Для людей (основной)** — dev-билдер в админке: **Разработка → Блоки**
  (`/dev/blocks`) — создание, редактирование схемы полей и удаление блоков
  через UI. Изменения пишутся прямо в исходники, Vite HMR подхватывает.
- **Для AI-агентов и скриптов** — CLI с JSON-конфигом (только создание):

```bash
pnpm generate:block --config design/blocks/my-block.json   # неинтерактивно
pnpm generate:block                                        # интерактивный мастер
```

После создания остаётся один ручной шаг — заменить stub web-рендерера
(`apps/web/app/components/blocks/renderers/{Pascal}Block.vue`) на вёрстку.

## Архитектура: слои одного блока

У каждого типа блока три обязательных файла и два опциональных слоя кастомизации:

```
packages/api/src/shared/blocks/{type}.ts          ← определение (ГЕНЕРИРУЕТСЯ, перезаписывается)
        │  defineBlock({ type, label, icon, description, category?,
        │                fields, dataSchema, defaultData })
        ▼
apps/admin/.../blocks/editors/{Pascal}Block.vue   ← admin-редактор (ГЕНЕРИРУЕТСЯ, перезаписывается)
apps/web/.../blocks/renderers/{Pascal}Block.vue   ← web-рендерер (stub при создании, дальше ТОЛЬКО руками)

— кастомные слои (генератор их НИКОГДА не трогает):
apps/admin/.../blocks/previews/{Pascal}BlockPreview.vue   ← live-превью под редактором (руками)
apps/admin/.../blocks/editors/{ProjectSelector,...}.vue   ← компоненты типов полей (руками)
apps/admin/public/block-previews/{type}.png               ← картинка-превью в пикере (загружается)
```

| Файл | Кто создаёт | Перезаписывается при сохранении схемы |
|---|---|---|
| `packages/api/src/shared/blocks/{type}.ts` | генератор | **да** — целиком |
| `apps/admin/app/components/blocks/editors/{Pascal}Block.vue` | генератор | **да** — целиком |
| `apps/web/app/components/blocks/renderers/{Pascal}Block.vue` | генератор (stub) | **нет** — никогда |
| `apps/admin/app/components/blocks/previews/{Pascal}BlockPreview.vue` | разработчик | нет |
| `apps/admin/public/block-previews/{type}.png` | загрузка/руками | нет (удаляется вместе с блоком) |

Регистрация:

- Определение регистрируется в массиве `allBlocks` в
  `packages/api/src/shared/blocks/index.ts` — генератор сам добавляет
  import и entry (а при удалении блока убирает). Руками не править.
- Из `allBlocks` собираются `contentBlockSchema` (discriminated union по
  `type`), `blockDefinitions` (метаданные для пикера), `getBlockDefaultData`
  и `normalizeBlockData`.
- Editor, renderer и preview-компоненты авторегистрируются через
  `import.meta.glob` по имени файла: `{PascalCase}Block.vue` → тип
  `{kebab-case}` (см. `editors/index.ts`, `renderers/index.ts`,
  `previews/index.ts`). Соседние файлы не конфликтуют: `ProjectSelector.vue`
  не подпадает под glob-паттерн `*Block.vue`, а `FallbackBlock.vue` подпадает,
  но отфильтровывается — типа `fallback` нет в `blockDefinitions`.

## Два пути создания блока

### 1. Dev-билдер `/dev/blocks` (основной путь для людей)

Доступен только в dev-режиме (`NODE_ENV !== "production"`, oRPC-роутер
`dev.blocks` защищён `devProcedure`: в проде — `FORBIDDEN`, плюс требуется
admin-сессия; пункт «Разработка» в сайдбаре виден только при `import.meta.dev`).

- **`/dev/blocks`** — список всех блоков с мини-превью; читается прямо с
  диска (парсинг `.ts`-файлов), а не из ESM-кеша — отражает текущее состояние
  файловой системы. Кнопка удаления у каждого блока.
- **`/dev/blocks/create`** — форма `BlockSchemaForm`: метаданные (имя
  kebab-case, label, описание, иконка `i-solar-*-linear`, категория) + поля
  с reorder/удалением, у repeater — вложенные subFields. Сохранение вызывает
  `dev.blocks.create`, который пишет те же 3 файла, что и CLI.
- **`/dev/blocks/{type}`** — редактирование схемы существующего блока +
  загрузка превью-PNG. Сохранение вызывает `dev.blocks.update`.

Что происходит при сохранении схемы (`update`):

1. `updateBlockDefinition` — файл определения
   `packages/api/src/shared/blocks/{type}.ts` **перезаписывается целиком**
   канонической эмиссией генератора (регистрация в `index.ts` не трогается).
2. `generateEditorComponent` — admin-редактор `{Pascal}Block.vue`
   **перезаписывается целиком** по шаблонам типов полей.
3. Web-рендерер **не трогается** — вёрстку под новые поля добавляете руками.
4. Файлы пишутся атомарно (tmp-файл + rename), Vite HMR подхватывает
   изменения без перезапуска dev-серверов.

Удаление (`delete`) убирает 4 файла (определение, editor, renderer,
превью-PNG) и import/entry из `blocks/index.ts`. Записи в БД с этим `type`
не трогаются — на сайте они отрендерятся `FallbackBlock`'ом (в dev — заглушка
«Неизвестный блок», в production не рендерится ничего; контент в БД цел).

> **Важно:** dev-билдер пишет в рабочую копию git. Изменения видны в
> `git diff`; «откат» — это `git checkout`/`git revert`, никакого другого
> undo нет.

### 2. CLI `pnpm generate:block` (для AI-агентов и скриптов)

```bash
# интерактивный мастер (@clack/prompts): имя, label, иконка, поля циклом
pnpm generate:block

# неинтерактивный — JSON-конфиг
pnpm generate:block --config design/blocks/feature-grid.json
```

JSON-конфиг — это `BlockInfo` (тот же формат, что у `dev.blocks.create`):

```json
{
  "name": "feature-grid",
  "label": "Сетка преимуществ",
  "description": "3–6 карточек с иконкой и текстом",
  "icon": "i-solar-widget-linear",
  "category": "content",
  "fields": [
    { "name": "title", "type": "string", "label": "Заголовок", "required": true },
    { "name": "showAll", "type": "boolean", "label": "Показывать все", "required": true, "default": true },
    { "name": "size", "type": "select", "label": "Размер", "required": true, "options": ["small", "large"] },
    {
      "name": "items", "type": "repeater", "label": "Карточки", "required": true,
      "minItems": 3, "maxItems": 6,
      "subFields": [
        { "name": "title", "type": "string", "label": "Заголовок", "required": true },
        { "name": "image", "type": "image", "label": "Картинка", "required": false }
      ]
    }
  ]
}
```

CLI умеет только **создавать** (упадёт, если блок существует). Редактирование
схемы — через `/dev/blocks/{type}`. Оба пути используют одни и те же
генераторы из `scripts/generate-block/generators/`, поэтому результат
байт-в-байт одинаковый.

## Типы полей

13 типов — реестр `BLOCK_FIELD_TYPES` в
`packages/api/src/shared/blocks/_core.ts`, шаблоны эмиссии — `FIELD_TYPES` в
`scripts/generate-block/field-types.ts`.

| Тип | Admin-редактор | Zod | TS | Примечания |
|---|---|---|---|---|
| `string` | `UInput` | `z.string()` | `string` | required → `.min(1)` |
| `text` | `UTextarea` (4 строки) | `z.string()` | `string` | required → `.min(1)` |
| `richtext` | `UEditor` + toolbar | `z.string()` | `string` | HTML; на сайте — `v-html` + `class="prose-web"`; required → `.min(1)` |
| `number` | `UInput type="number"` | `z.number()` | `number` | |
| `boolean` | `USwitch` | `z.boolean()` | `boolean` | required-звёздочка не показывается (значение есть всегда) |
| `url` | `UInput type="url"` | `z.union([z.string().url(), z.literal("")])` | `string` | пустая строка валидна |
| `image` | `ImageUpload` (folder `blocks`) | `z.string().url()` | `string \| null` | optional → `.nullable()` (не `.optional()`); канонический default required-image — `null` |
| `images` | `GalleryUpload` | `z.array(z.string().url())` | `string[]` | |
| `strings` | `TagInput` | `z.array(z.string())` | `string[]` | произвольный список строк-тегов |
| `select` | `USelect` | `z.enum(options)` | `string` | **требует `options: string[]`**; канонический default — первая опция |
| `project` | `ProjectSelector` | `z.string()` | `string` | relation: хранится **id проекта**, выбор из справочника; required → `.min(1)` |
| `contacts` | `ContactsSelector` | `z.array(z.string())` | `string[]` | relation: хранятся **id контактов** (мультивыбор из справочника) |
| `repeater` | `RepeaterField` | `z.array(z.object({...subFields})).min(n).max(m)` | `Array<{...}>` | **требует `subFields`**; `minItems`/`maxItems` опциональны; repeater внутри subFields запрещён |

Общие правила эмиссии:

- `required: false` → `.optional()` в Zod и `?` в TS-типе; исключение —
  `image`, который становится `.nullable()`.
- Канонические default-значения в `defaultData` применяются к
  **required**-полям: `""` для строковых, `0`, `false`, `[]`, первая опция
  для select, `null` для image. Optional-поля любого типа эмитятся как
  `undefined` (исключение — repeater, он всегда `[]`). Если нужно другое
  значение — поле `default` (см. ниже).
- Relation-типы (`project`, `contacts`) хранят только id; данные сущностей
  подтягиваются на месте использования (например, через `useProjectData`
  в превью или публичные процедуры на сайте).

## `fields` и канонический round-trip

`fields: BlockField[]` в `defineBlock` — декларативный **source of truth**
схемы блока. `dataSchema` (Zod) и `defaultData` — производные от него,
генератор эмитит их детерминированно.

```ts
interface BlockField {
  name: string;          // camelCase
  type: BlockFieldType;  // один из 13
  label: string;
  required: boolean;
  default?: unknown;     // значение в defaultData, если отличается от канонического
  description?: string;  // подсказка под полем в форме
  options?: string[];    // только select
  minItems?: number;     // только repeater
  maxItems?: number;     // только repeater
  subFields?: BlockField[]; // только repeater
}
```

**Инвариант idempotency:** для каждого блока файл определения на диске
байт-в-байт равен `buildBlockDefinitionSource(blockInfo)` — канонической
эмиссии генератора. Это проверяет тест «канонический round-trip» в
`scripts/generate-block/__tests__/generators.test.ts`. Благодаря этому
открыть блок в `/dev/blocks/{type}` и нажать «Сохранить» без изменений —
no-op (файл не меняется).

Что значит «генерируемый артефакт» на практике:

- **Определение блока** (`blocks/{type}.ts`) руками не правят. Любая ручная
  правка либо уронит round-trip-тест (если отступы/порядок/формат отличаются
  от канонических), либо будет перезаписана при следующем сохранении из
  `/dev/blocks`.
- **Admin-редактор** (`editors/{Pascal}Block.vue`) перегенерируется при
  каждом сохранении схемы — ручные правки в нём **потеряются** (восстановление
  через git). Кастомное поведение выносится в слои, которые генератор не
  трогает (см. «Кастомизация»).
- **Web-рендерер** генерируется один раз stub'ом и дальше полностью ручной.

### Поле `default`

Нужно, когда канонический default типа не подходит: переключатель, включённый
по умолчанию (`default: true`), предзаполненный заголовок (`default:
"Контакты"`), высота карты (`default: 400`). Значение попадает в `defaultData`
и эмитится в fields-литерале.

- Задаётся в JSON-конфиге CLI при создании блока.
- В UI билдера `default` **не редактируется**, но переживает round-trip
  (сохранение схемы его не теряет). Смена типа поля в форме сбрасывает
  `default` — старое значение может противоречить новой схеме.
- `default: null` валиден только для необязательного `image`.

## Превью блока в пикере

Конвенция: PNG-скриншот блока по пути
`apps/admin/public/block-previews/{type}.png`. Показывается:

- в пикере блоков (`BlockPicker`, слайдовер «Добавить блок») — широкая
  картинка над названием;
- в списке `/dev/blocks` — мини-превью в строке.

Если файла нет (img выдал ошибку) — graceful fallback на иконку блока.

Загрузка — на странице `/dev/blocks/{type}`, карточка «Превью в пикере»
(процедура `dev.blocks.uploadPreview`). Ограничения: только PNG (проверяются
magic bytes), до ~3 МБ файла (клиент режет на 3.3 МБ, сервер — 4.5 млн
символов base64). Можно и просто положить файл руками. **Файл коммитится в
git** — это часть исходников, а не runtime-загрузка. При удалении блока
превью удаляется вместе с ним.

## Live-превью в редакторе

Опциональный ручной слой: `apps/admin/app/components/blocks/previews/{Pascal}BlockPreview.vue`.

- Авторегистрация через `import.meta.glob` по имени файла
  (`ProjectStatsBlockPreview.vue` → тип `project-stats`), реестр —
  `previews/index.ts`.
- Если компонент существует, `BlockDynamicZone` рендерит его **под формой
  редактора** блока и передаёт prop `data` — нормализованные данные блока
  (после `normalizeBlockData`, т.е. с подставленными default'ами).
- Компонент полностью ручной, генератор его не создаёт и не перезаписывает.

Когда использовать: блоки, чей вид зависит от внешних данных, — например,
project-блоки, где по `projectId` подтягивается статистика/галерея
(`useProjectData`), и контент-менеджеру важно видеть результат до публикации.
Для простых текстовых блоков превью обычно не нужно.

Пример: [ProjectStatsBlockPreview.vue](../apps/admin/app/components/blocks/previews/ProjectStatsBlockPreview.vue).

## Совместимость контента при изменении схемы

**Данные в БД не мигрируются** (как в Strapi). Совместимость обеспечивается
при чтении: и админка (`BlockDynamicZone`), и сайт (`BlockRenderer`) прогоняют
`data` блока через `normalizeBlockData(type, data)` — shallow-merge
`{ ...defaultData, ...data }`.

Что это даёт и где подводные камни:

- **Новое поле** → у старого контента появится default-значение. Это
  основной сценарий, ради которого normalize-merge существует.
- **Мерж поверхностный**: элементы repeater-массивов не нормализуются.
  Новое subField будет отсутствовать в уже существующих элементах — web-рендерер
  и превью обязаны обращаться к таким ключам опционально
  (`item.newField ?? fallback`).
- **Переименование поля** — это удаление + добавление. Данные страниц
  останутся под старым ключом (normalize их не удаляет, лишние ключи
  сохраняются как есть), а новое поле получит default. Контент придётся
  перенести руками (или временно прочитать старый ключ в рендерере).
  Zod отбросит лишние ключи только при следующем сохранении страницы.
- **Смена типа поля** — данные не конвертируются. Строка в поле, ставшем
  `strings`, останется строкой до пересохранения; рендерер должен быть
  готов, либо контент нужно пересохранить в админке.
- **Required и старый контент**: normalize подставит канонический default
  (`""` и т.п.), но Zod-схема с `.min(1)` не пропустит его при сохранении
  страницы — контент-менеджеру придётся заполнить поле. Это осознанное
  поведение, не баг.
- **Удалённый тип блока**: на сайте такие записи рендерятся `FallbackBlock`,
  в админке редактор не найдётся — данные в БД при этом целы.

## Кастомизация

**Золотое правило: editor-SFC и файл определения руками не правят.** Это
генерируемые артефакты — правки перезапишутся при сохранении схемы и уронят
round-trip-тест.

Куда класть кастомный код:

| Что нужно | Куда |
|---|---|
| Вёрстка блока на сайте | `apps/web/.../renderers/{Pascal}Block.vue` — всегда ручной, начиная со stub'а |
| Превью данных под редактором | `apps/admin/.../blocks/previews/{Pascal}BlockPreview.vue` |
| Нестандартный инпут в редакторе | **новый тип поля** — компонент + шаблон эмиссии (см. ниже) |

Новый тип поля (так появились `project`, `contacts`, `strings`):

1. Добавить в `BLOCK_FIELD_TYPES` в `packages/api/src/shared/blocks/_core.ts`.
2. Добавить entry в `FIELD_TYPES` в `scripts/generate-block/field-types.ts` —
   label, `zodType`, `tsType`, `defaultValue` и `vueTemplate` (какой компонент
   эмитится в редактор).
3. Создать сам компонент (например, в
   `apps/admin/app/components/blocks/editors/MySelector.vue` — glob-реестр его
   проигнорирует, т.к. имя не оканчивается на `Block.vue` с валидным типом).
4. Добавить русский label в `blockFieldTypeLabels` в
   `apps/admin/app/utils/block-schema.ts` (TS заставит — Record по всем типам).
5. При особых ограничениях — рефайнмент в
   `packages/api/src/routers/dev/blocks-schema.ts`.
6. Дополнить `fieldTypeEditors` в `apps/admin/app/pages/dev/docs/index.vue`
   (тоже Record по всем типам — TS заставит): строка в таблице типов на
   `/dev/docs` появится сама, но колонке «Редактор» нужно значение.

После этого тип доступен и в CLI, и в dev-билдере, а сохранение схемы любого
блока с этим полем эмитит ваш компонент в редактор.

## Тесты-инварианты

Запуск: `pnpm test` (= `vitest run`) из корня. 4 сьюта, 78 тестов:

| Сьют | Что ловит |
|---|---|
| `packages/api/src/shared/blocks/__tests__/blocks.test.ts` | **Consistency**: имена `fields` совпадают с ключами `defaultData` и shape `dataSchema`; select — `z.enum` с теми же options; repeater — `z.array(z.object)` с теми же subFields и min/max; `field.default` совпадает со значением в `defaultData`. Плюс поведение `normalizeBlockData` (default'ы, лишние ключи, null). Ловит ручной дрейф определения. |
| `scripts/generate-block/__tests__/generators.test.ts` | **Idempotency / round-trip**: для каждого из блоков файл определения байт-в-байт равен канонической эмиссии `buildBlockDefinitionSource`. Плюс снапшоты сгенерированных definition/editor/renderer и поведение `updateBlockDefinition`. Ловит ручные правки определений и регрессии шаблонов генератора. |
| `packages/api/src/routers/dev/__tests__/blocks-schema.test.ts` | Валидации `blockInfoSchema`: select без options, repeater без subFields, вложенный repeater, дубликаты имён, `minItems > maxItems`, недопустимый `default: null`. |
| `apps/admin/app/utils/__tests__/block-schema.test.ts` | Хелперы формы билдера: сериализация полей (трим, очистка options/min/max, выживание `default`), клиентская валидация формы. |

Изменили что-то в блочной системе — прогоните `pnpm test` до коммита.

## FAQ / Troubleshooting

**Зачем поле `default`, если есть defaultData?**
`defaultData` — производный артефакт, руками его не правят. `default` в
`fields` — единственный канонический способ сказать «у этого поля default
не такой, как у типа». Без него boolean всегда стартует с `false`, select —
с первой опции и т.д.

**Я доработал редактор блока, а после сохранения схемы правки исчезли.**
Так и задумано: editor-SFC — генерируемый артефакт, сохранение из
`/dev/blocks/{type}` перезаписывает его целиком (UI предупреждает об этом
алертом). Правки восстанавливаются через git; затем кастом переносится в
правильный слой — компонент типа поля или preview-компонент.

**Почему превью блока не показывается в пикере?**
Нет файла `apps/admin/public/block-previews/{type}.png` — тогда показывается
иконка (это штатный fallback). Проверьте имя файла (точно `{type}.png`,
kebab-case) и что файл закоммичен. После загрузки через UI страница
`/dev/blocks/{type}` обновляет картинку сама (cache-busting `?v=`), но в
пикере может понадобиться обновить страницу из-за браузерного кеша.

**uploadPreview возвращает ошибку.**
Принимается только PNG (сервер проверяет magic bytes, JPEG/WebP не пройдут)
размером до ~3 МБ. `NOT_FOUND` — блока с таким `type` нет на диске.

**`/dev/blocks` недоступен / dev.blocks отвечает FORBIDDEN.**
Раздел работает только в dev-режиме (`NODE_ENV !== "production"`) и требует
admin-сессию. В проде эндпоинты намеренно закрыты — схема блоков меняется
только через деплой.

**Сохранил схему, а тост говорит «генерация редактора упала».**
Определение уже перезаписано, редактор — нет. Состояние видно в `git diff`;
исправьте причину (текст ошибки в тосте) и сохраните схему ещё раз, либо
откатите определение через git.

**Round-trip-тест упал после моих правок.**
Вы отредактировали файл определения руками в неканоническом формате. Откатите
правку и внесите изменение через `/dev/blocks/{type}` (или поправьте файл так,
чтобы он совпадал с эмиссией — проще не пытаться).

**Удалил блок, а страницы с ним остались в БД. Это проблема?**
Нет: на сайте такие блоки рендерятся `FallbackBlock`, данные не теряются.
Если блоки этого типа есть в проде — спланируйте миграцию контента до
удаления.

## Где живёт что

| Файл | Что |
|---|---|
| `packages/api/src/shared/blocks/_core.ts` | `defineBlock`, `BlockField`, `BLOCK_FIELD_TYPES` |
| `packages/api/src/shared/blocks/{type}.ts` | определения блоков (генерируемые) |
| `packages/api/src/shared/blocks/index.ts` | `allBlocks`, `contentBlockSchema`, `getBlockDefaultData`, `normalizeBlockData` |
| `packages/api/src/routers/dev/blocks.ts` | oRPC `dev.blocks`: list / create / update / delete / uploadPreview |
| `packages/api/src/routers/dev/blocks-schema.ts` | Zod-валидация `BlockInfo` (вход билдера) |
| `scripts/generate-block.ts` | CLI-entrypoint (интерактив + `--config`) |
| `scripts/generate-block/field-types.ts` | шаблоны эмиссии 13 типов полей (Zod/TS/Vue) |
| `scripts/generate-block/generators/` | эмиттеры definition / editor / renderer (общие для CLI и билдера) |
| `apps/admin/app/pages/dev/blocks/` | страницы билдера: index / create / [type] |
| `apps/admin/app/components/blocks/BlockSchemaForm.vue` | форма схемы (meta + поля + reorder) |
| `apps/admin/app/components/blocks/BlockDynamicZone.vue` | редактор списка блоков на странице |
| `apps/admin/app/components/blocks/BlockPicker.vue` | пикер «Добавить блок» с превью |
| `apps/admin/app/components/blocks/editors/` | генерируемые редакторы + компоненты полей (ProjectSelector, ContactsSelector) |
| `apps/admin/app/components/blocks/previews/` | ручные live-превью + glob-реестр |
| `apps/admin/app/utils/block-schema.ts` | labels типов, сериализация/валидация формы билдера |
| `apps/admin/public/block-previews/` | PNG-превью для пикера (коммитятся) |
| `apps/web/app/components/blocks/BlockRenderer.vue` | рендер блоков на сайте (normalize + fallback) |
| `apps/web/app/components/blocks/renderers/` | ручные web-рендереры + glob-реестр |
