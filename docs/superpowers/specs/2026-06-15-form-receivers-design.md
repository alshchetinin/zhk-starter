# Расширяемая система приёмщиков форм

**Issue:** [#69](https://github.com/alshchetinin/zhk-starter/issues/69)
**Дата:** 2026-06-15
**Статус:** дизайн

## Проблема

Данные форм (`tickets`) сейчас уходят наружу единственным способом — **Telegram**, fire-and-forget,
прямо в хендлере [`public/tickets.ts`](../../../packages/api/src/routers/public/tickets.ts) (функция
`sendTelegramNotification`, строки 7–55, вызов 99–105). Конфигурация — глобальная строка
`ticket_settings` (`telegramBotToken` + `telegramChatId`), причём и хендлер `create`, и
`ticketSettings.get/save` читают её через `findFirst()` **без фильтра по `siteId`** — то есть
настройка фактически **не per-site**, хотя система мультитенантная.

Email/webhook/SMS не реализованы. Привязки «какая форма → куда отправлять» нет: все формы (а форма
сейчас одна — `modals`) шлют в `public.tickets.create`, и Telegram срабатывает на всё подряд. Добавить
новый канал доставки нельзя без правки хендлера.

## Цель

Сделать отправку данных форм через **реестр приёмщиков (receivers)**, чтобы:

1. **Легко добавлять приёмщик в коде** — новый тип = пара файлов + авторегистрация, без правки хендлера.
2. **Гибко настраивать на сайте** — админ заводит N приёмщиков (per-site), каждая форма выбирает, какие
   из них срабатывают.
3. **Видеть доставку** — лог попыток в БД, ручной ретрай из админки.

Стартовые 3 типа: **webhook, telegram, email**. Архитектура рассчитана на дальнейшее расширение
(SMS, CRM-коннекторы и т.п.).

## Ключевые решения (из брейншторма)

| Решение | Выбор |
| --- | --- |
| Модель привязки | Список приёмщиков на сайте (per-site); форма выбирает, какие срабатывают |
| Надёжность доставки | Лог попыток в БД + ручной ретрай. **Без** очереди/воркера |
| Охват форм | Модалки + form-agnostic привязка (`receiverIds`). Новые типы форм не строим (YAGNI) |
| Email-транспорт | Один SMTP на платформу через env (nodemailer); config email-приёмщика = `to` + `subject` |
| Доставка vs ответ | Тикет сохраняется и ответ отдаётся сразу; доставка идёт фоном (не блокирует HTTP-ответ) |

## Не-цели (вне скоупа)

- **Очередь/воркер/авторетраи** — только ручной ретрай по логу. Авторетраи с backoff — отдельно, если понадобится.
- **Новые типы форм** (form-блок в странице) — привязка делается form-agnostic, но строим только под модалки.
- **Per-receiver SMTP / transactional API (Resend)** — один SMTP на платформу. Per-receiver SMTP требует
  шифрования паролей в БД — отложено.
- **Фильтрация приёмщиков по типу заявки** (`type`) — маршрутизацию уже даёт per-form выбор. Реестр это
  поддержит позже без миграции данных.
- **Браузерный SDK / клиентский выбор приёмщиков** — клиент не выбирает приёмщики (безопасность), резолв на сервере.

## Архитектура

### A. Реестр приёмщиков — ядро расширяемости

Зеркалит паттерн блоков и провайдеров аналитики/трекинга. **Один тип приёмщика = один файл метаданных
+ один файл доставки.**

**Метаданные (изоморфны — импортирует и admin, и сервер)** — `packages/api/src/shared/receivers/`:

```ts
interface ReceiverDefinition<C = unknown> {
  type: string                 // "webhook" | "telegram" | "email"
  label: string                // имя в пикере админки
  icon: string                 // i-solar-*-linear
  description: string
  configSchema: z.ZodType<C>   // валидирует config приёмщика
  defaultConfig: C             // дефолт для формы «новый приёмщик»
}

export function defineReceiver<C>(def: ReceiverDefinition<C>): ReceiverDefinition<C> { return def }
```

`index.ts` собирает `allReceivers: ReceiverDefinition[]` + `receiverDefByType: Map<string, ReceiverDefinition>`
(как `allBlocks`). Метаданные **не** содержат node-зависимостей → безопасны для admin-бандла.

**Доставка (server-only — nodemailer/fetch/crypto)** — `packages/api/src/services/receivers/`:

```ts
type Deliverer<C = unknown> =
  (ctx: DeliveryContext, config: C) => Promise<DeliveryResult>

type DeliveryResult = { ok: true } | { ok: false; error: string }
```

Отдельный модуль `deliverers: Record<string, Deliverer>` импортируется **только** хендлером/сервисом
доставки, чтобы nodemailer не попал в admin-бандл (как разделение «определение блока / web-рендерер»).

**Consistency-тест** (`packages/api/src/shared/receivers/__tests__/`) держит соответствие: множество
типов в `allReceivers` == множество ключей `deliverers`. Добавить приёмщик = создать оба файла +
зарегистрировать; тест не даст забыть половину.

### B. Контракт доставки `DeliveryContext`

Стабильная документированная форма, которую получает **каждый** приёмщик:

```ts
interface DeliveryContext {
  ticket: {
    id: string
    name: string | null
    phone: string
    email: string | null
    message: string | null
    type: string            // lead | callback | question | booking
    source: string | null   // напр. "modal:contact-form"
    url: string | null
    createdAt: string        // ISO
  }
  utm: Record<string, string> | null
  site: { id: string; name: string }
  fields: Array<{ label: string; value: string }>  // человекочитаемые поля формы
}
```

`fields` собирается из labels модалки (если submission резолвится в модалку) — это улучшение: сейчас
доп-поля формы свалены строкой в `message`, а так Telegram/email покажут «Имя: …, Бюджет: …»
по-человечески. Webhook получает весь `DeliveryContext` как JSON.

### C. Модель данных (строго per-site)

**`form_receivers`** — приёмщики сайта (новая таблица):

| Поле | Тип | Примечание |
| --- | --- | --- |
| `id` | text PK uuid | |
| `siteId` | text FK → sites | notNull |
| `type` | text | соответствует `ReceiverDefinition.type` |
| `name` | text | имя для админа («Telegram отдела продаж») |
| `config` | jsonb | валидируется `configSchema` соответствующего типа |
| `enabled` | boolean | default true — глобальный вкл/выкл приёмщика |
| `sortOrder` | integer | |
| `createdAt` / `updatedAt` | timestamptz | |

**Привязка формы → приёмщики (form-agnostic).** Колонка `modals.receiverIds: text[]` (default `'{}'`) —
явный список id приёмщиков, которые срабатывают для этой формы. Любая будущая форма несёт такой же
список (form-блок — как поле блока). Хранится **явный** набор (не «магическое all»): новая модалка в
UI получает все текущие enabled-приёмщики предотмеченными; добавленный позже приёмщик в старые формы
**не** попадает автоматически (безопасный дефолт — новый webhook не должен внезапно стрелять на всех формах).

**`form_deliveries`** — лог попыток (новая таблица):

| Поле | Тип | Примечание |
| --- | --- | --- |
| `id` | text PK uuid | |
| `ticketId` | text FK → tickets | onDelete cascade |
| `receiverId` | text FK → form_receivers | onDelete set null (лог переживает удаление приёмщика) |
| `receiverType` | text | снапшот для отображения после удаления приёмщика |
| `receiverName` | text | снапшот |
| `status` | enum `delivery_status` | `pending` \| `ok` \| `error` |
| `error` | text nullable | текст ошибки последней попытки |
| `attempts` | integer | default 0 |
| `lastAttemptAt` | timestamptz nullable | |
| `createdAt` / `updatedAt` | timestamptz | |

### D. Поток доставки

Хендлер `public.tickets.create`:

1. Вставить тикет (как сейчас).
2. **Резолв приёмщиков на сервере** (безопасность — клиент не передаёт receiverIds):
   - по `source` вида `modal:{slug}` загрузить модалку → взять `receiverIds` ∩ enabled-приёмщики сайта;
   - если форма не резолвится (программная заявка / неизвестный source) → **все enabled-приёмщики
     сайта** (сохраняет текущее «Telegram шлётся на всё»).
   - заодно из модалки берутся labels полей для `DeliveryContext.fields`.
3. Вставить по одной `pending`-строке `form_deliveries` на каждый резолвнутый приёмщик (durable —
   переживает рестарт процесса).
4. **Ответить сразу** `{ success, id }` (быстрый UX как сейчас).
5. Фоном (не блокируя ответ) `void processTicketDeliveries(ticketId)`: `Promise.allSettled` по deliverers;
   каждая строка → `ok`/`error`, `attempts++`, `lastAttemptAt`.

**Тредофф:** «висящий» промис на долгоживущем Node/Hono-сервере (apps/server, :3000) допустим. При
рестарте процесса недоставленные строки остаются `pending` → ретраибельны вручную. (Гарантированное
завершение через `await` перед ответом ценой латентности — сознательно не берём; быстрый ответ важнее.)

Сервис `packages/api/src/services/receivers/dispatch.ts`:
- `processTicketDeliveries(ticketId)` — собрать `DeliveryContext`, прогнать pending/error строки;
- `deliverOne(deliveryRow, receiver, ctx)` — вызвать `deliverers[receiver.type]`, записать результат.

Переиспользуется ретраем из админки.

### E. Стартовые 3 приёмщика

**webhook** — `config: { url: string (url), method?: "POST", headers?: Record<string,string>, secret?: string }`
- `deliver`: POST `DeliveryContext` как JSON; при `secret` — заголовок `X-Signature: sha256=<hmac>`
  (HMAC-SHA256 тела, `node:crypto`); статус 2xx → ok, иначе error со статусом+телом.

**telegram** — `config: { botToken: string, chatId: string }`
- `deliver`: формат сообщения (переиспользуем текущее форматирование + блок `fields`), POST в Bot API,
  `res.ok` → ok. Базируется на существующем `services/notify.ts::sendTelegramMessage`.

**email** — `config: { to: string, subject?: string }`
- `deliver`: nodemailer-транспорт из env (`SMTP_HOST/PORT/USER/PASS/FROM/SECURE`); письмо (text + простой
  HTML) на `to`, from `SMTP_FROM`; тема — `subject` или дефолт по типу заявки. Если SMTP не сконфигурен —
  `{ ok: false, error: "SMTP не настроен" }` (запишется в лог, тикет не страдает).

**env (packages/env/src/server.ts):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`,
`SMTP_SECURE` — все опциональны (email-приёмщик no-op без них). Зависимость `nodemailer` (+ типы) в `packages/api`.

### F. oRPC-процедуры

Admin (protected, site-scoped):
- `formReceivers.list` — приёмщики текущего сайта
- `formReceivers.create` / `.update` / `.delete` / `.reorder` — `config` валидируется `configSchema` по `type`
- `formReceivers.test` — тестовая доставка в один приёмщик (кнопка «Проверить»; синтетический `DeliveryContext`)
- `tickets.getById` — дополняется списком `deliveries` (или отдельная `tickets.deliveries`)
- `tickets.retryDelivery` — ретрай одной строки или всех `error`/`pending` тикета (зовёт `processTicketDeliveries`)

Public:
- `public.tickets.create` — расширяется резолвом приёмщиков + записью `form_deliveries` (input не меняется —
  клиент шлёт как раньше).

Модалки: `modals.create/update` принимают `receiverIds: string[]`.

### G. Admin UI

- **Страница «Приёмщики»** — новая `tickets/receivers.vue` (нынешняя `tickets/settings.vue` удаляется,
  см. «Миграция»): список с бейджем типа, имя, тумблер
  `enabled`, edit/delete, reorder; «Добавить приёмщик» → выбор типа из реестра → config-редактор типа;
  кнопка «Проверить».
- **Config-редакторы — registry-driven**, по одному SFC на тип (`WebhookReceiverConfig`,
  `TelegramReceiverConfig`, `EmailReceiverConfig`), авторегистрация по имени через `import.meta.glob`
  (как block-editors). Только `@nuxt/ui`.
- **Редактор модалки** (`modals/[id].vue`): секция «Приёмщики» — чекбоксы приёмщиков сайта (`receiverIds`).
- **Деталь заявки** (`tickets/[id].vue`): карточка **«Доставка»** — строка на приёмщик со статусом
  (pending/ok/error), временем, ошибкой и кнопкой «Повторить».

### H. Миграция

**Schema (Drizzle):** создать `form_receivers`, `form_deliveries`, enum `delivery_status`; добавить
`modals.receiverIds text[] default '{}'`.

**Data-миграция:** существующую глобальную telegram-конфигурацию `ticket_settings` (если `telegramBotToken`
и `telegramChatId` заполнены) сконвертировать в `form_receivers` строку типа `telegram` на **primary-сайте**
(`sites.isPrimary`), `name = "Telegram"`, `enabled = true`. Проставить её id в `receiverIds` всех
существующих модалок этого сайта — сохранить текущее поведение «Telegram на всё». Таблица `ticket_settings`,
роутер `ticket-settings.ts` и страница `tickets/settings.vue` удаляются после миграции.

> Замечание про мультитенантность: `ticket_settings` была глобальной (хендлер делал `findFirst()` без
> `siteId`), поэтому одна строка фактически обслуживала все сайты. Миграция привязывает её к primary-сайту;
> для остальных сайтов приёмщики настраиваются заново в новой админке. Это сознательная нормализация
> ранее-сломанной семантики.

## Тестирование

- **Config-схемы + deliver каждого типа** — unit, mock `fetch` / nodemailer transport (webhook: 2xx→ok,
  5xx→error, HMAC-подпись при secret; telegram: res.ok; email: no-op без SMTP).
- **Резолвер `source → receiverIds`** — модалка найдена/не найдена, пересечение с enabled, fallback на all.
- **Consistency-тест** — типы `allReceivers` == ключи `deliverers`.
- **Dispatch** — `pending` строки создаются, статусы проставляются, ретрай переигрывает `error`/`pending`.

## Карта файлов

**Новые:**
- `packages/api/src/shared/receivers/{_core,index,webhook,telegram,email}.ts` — метаданные + реестр
- `packages/api/src/services/receivers/{index,dispatch,webhook,telegram,email}.ts` — deliverers + диспетчер
- `packages/db/src/schema/{form-receivers,form-deliveries}.ts` — таблицы (+ enum в `_enums.ts`)
- `packages/api/src/routers/form-receivers.ts` — admin CRUD + test
- `apps/admin/app/pages/tickets/receivers.vue` — страница приёмщиков
- `apps/admin/app/components/receivers/{Webhook,Telegram,Email}ReceiverConfig.vue`
- тесты в `__tests__/` соответствующих пакетов

**Меняются:**
- `packages/db/src/schema/{modals,index}.ts` — `receiverIds`; экспорт новых таблиц/enum
- `packages/api/src/routers/public/tickets.ts` — резолв приёмщиков + запись `form_deliveries` (выпил
  inline `sendTelegramNotification`)
- `packages/api/src/routers/tickets.ts` — `deliveries` в getById + `retryDelivery`
- `packages/api/src/routers/modals.ts` — `receiverIds`
- `packages/env/src/server.ts` — `SMTP_*`
- `apps/admin/app/pages/tickets/[id].vue` — карточка «Доставка»
- `apps/admin/app/pages/modals/[id].vue` — секция «Приёмщики»
- навигация админки (пункт «Приёмщики»)

**Удаляются (после миграции):**
- `packages/db/src/schema/ticket-settings.ts`, `packages/api/src/routers/ticket-settings.ts`,
  `apps/admin/app/pages/tickets/settings.vue`
