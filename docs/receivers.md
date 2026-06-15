# Приёмщики форм

Расширяемая система доставки заявок из форм сайта. Заменяет захардкоженную
Telegram-отправку на реестр приёмщиков (webhook / telegram / email),
настраиваемых per-site, выбираемых каждой формой (модалкой), с логом доставок
и ручным ретраем.

Спека: [`docs/superpowers/specs/2026-06-15-form-receivers-design.md`](superpowers/specs/2026-06-15-form-receivers-design.md).

## Архитектура

Два независимых слоя:

| Слой | Путь | Назначение |
|---|---|---|
| **Метаданные** (изоморфны) | `packages/api/src/shared/receivers/` | `defineReceiver`, `allReceivers`, configSchema, `parseReceiverConfig` — используются и в сервере, и в admin-SFC |
| **Доставка** (server-only) | `packages/api/src/services/receivers/` | `deliverers`, `buildDeliveryContext`, `resolveReceiverIds`, диспетчер `dispatch.ts` |

Каждый тип = 2 файла (метаданные + deliver) + config-редактор в admin.
Consistency-тест (`services/receivers/__tests__/deliverers.test.ts`) следит, что
набор ключей `deliverers` совпадает с `receiverTypes` из реестра метаданных.

## Модель данных

### `form_receivers` — per-site реестр приёмщиков

`packages/db/src/schema/form-receivers.ts`:

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `text` PK | UUID |
| `siteId` | `text` FK→sites | Каскадное удаление |
| `type` | `text` | `webhook` / `telegram` / `email` |
| `name` | `text` | Человекочитаемое имя (для лога) |
| `config` | `jsonb` | Конфиг типа (url, botToken, to…) |
| `enabled` | `boolean` | Выключатель без удаления |
| `sortOrder` | `integer` | Порядок отображения |

### `modals.receiverIds`

`text[]` — список id приёмщиков `form_receivers`, срабатывающих при сабмите
конкретной формы (модалки). `packages/db/src/schema/modals.ts`.

### `form_deliveries` — лог доставок

`packages/db/src/schema/form-deliveries.ts`:

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `text` PK | UUID |
| `ticketId` | `text` FK→tickets | Каскадное удаление |
| `receiverId` | `text` FK→form_receivers | `SET NULL` при удалении приёмщика |
| `receiverType` | `text` | Снапшот типа (сохраняется даже после удаления) |
| `receiverName` | `text` | Снапшот имени |
| `status` | `delivery_status` | `pending` / `ok` / `error` |
| `error` | `text` | Текст ошибки (при `error`) |
| `attempts` | `integer` | Количество попыток |
| `lastAttemptAt` | `timestamp` | Время последней попытки |

## Поток от сабмита до лога

`public.tickets.create` (`packages/api/src/routers/public/tickets.ts`):

1. Сохраняет тикет в `tickets`.
2. Берёт все включённые приёмщики сайта (`form_receivers WHERE enabled=true`).
3. Резолвит целевые id через `resolveReceiverIds(form, enabled)`:
   - `source = "modal:{slug}"` → находит модалку по slug → берёт её `receiverIds` ∩ enabled;
   - форма не найдена (нет source / не модалка) → **все enabled** (бэк-компат).
4. Пишет `pending`-строки в `form_deliveries` через `createPendingDeliveries`.
5. Запускает `processTicketDeliveries` **фоново** (`void ...catch(captureUnexpected)`) —
   ответ клиенту не блокируется; строки уже в БД (durable).

`processTicketDeliveries` (повторно используется ретраем):
- Берёт доставки в статусах `pending` / `error` (или конкретные `deliveryIds`).
- Парсит config через `configSchema` приёмщика.
- Вызывает `deliverers[receiverType](ctx, config)`.
- Обновляет статус, `error`, `attempts`, `lastAttemptAt`.

## Контракт `DeliveryContext`

Что получает каждый deliverer (`packages/api/src/shared/receivers/_core.ts`):

```ts
interface DeliveryContext {
  ticket: {
    id: string;
    name: string | null;
    phone: string | null;  // nullable: форма может не иметь phone-поля
    email: string | null;
    message: string | null;
    type: string;          // lead / callback / question / booking
    source: string | null; // "modal:{slug}" или произвольная строка
    url: string | null;    // страница, с которой отправлена форма
    createdAt: string;     // ISO 8601
  };
  utm: Record<string, string> | null;
  site: { id: string; name: string };
  /** Непустые поля формы с RU-лейблами — для форматирования сообщений. */
  fields: Array<{ label: string; value: string }>;
}
```

> **Breaking change для webhook-потребителей:** `ticket.phone` может быть `null`
> (телефон стал необязательным полем формы). Внешние вебхуки, полагавшиеся на
> строку, должны учитывать `null` и не падать при его отсутствии.

`buildDeliveryContext` (`services/receivers/payload.ts`) собирает `fields`
через `ticketDisplayFields` (`packages/api/src/shared/ticket-fields.ts`):
берёт данные из `ticket.additionalInfo.fields` (полный структурный набор полей
формы, включая дубликаты и кастомные поля типа `description`/`checkbox`), фильтрует
пустые значения. Для старых заявок без `additionalInfo.fields` — fallback на
колонки `name`/`phone`/`email`/`message`.

## Поля заявки

Подробный дизайн: [`docs/superpowers/specs/2026-06-15-flexible-ticket-fields-design.md`](superpowers/specs/2026-06-15-flexible-ticket-fields-design.md).

Поля формы хранятся структурно в `tickets.additionalInfo.fields` (`TicketField[]`) —
полный набор в порядке отправки, включая повторяющиеся типы (два телефона, несколько
чекбоксов) и кастомные `description`-поля. Первичные колонки (`tickets.name`,
`tickets.phone`, `tickets.email`, `tickets.message`) дублируют данные для удобства
SQL-фильтрации — деривируются функцией `deriveTicketColumns` из того же набора.
`tickets.phone` **nullable**: форма не обязана содержать поле типа `phone`.

Чистый слой — `packages/api/src/shared/ticket-fields.ts`:

| Функция | Назначение |
|---|---|
| `normalizeSubmission(input)` | Принимает `{ fields?, name?, phone?, email?, message? }` → `TicketField[]`. Если `fields` не пуст — берёт их, иначе синтез из flat-колонок (backward compat). |
| `deriveTicketColumns(fields)` | Деривирует первичные колонки из `TicketField[]` (первый непустой матч по типу). |
| `validateSubmission(fields, formDef)` | Валидация: если есть `formDef` — проверяет required по определению формы; иначе мягкий минимум (телефон ИЛИ почта). Формат email проверяется всегда. |
| `ticketDisplayFields(ticket)` | Поля для отображения: `additionalInfo.fields` ИЛИ fallback на колонки. |

Обязательность полей задаётся в конструкторе модалки (`modals.fields: FormFieldDef[]`)
и валидируется сервером по этому определению. Телефон — НЕ универсально обязателен;
обязателен только если так настроена конкретная форма.

## Три стартовых типа

### webhook

Конфиг: `url` (обязателен, валидный URL), `method` (`POST` / `PUT`, default `POST`),
`headers` (Record, опционально), `secret` (HMAC, опционально).

Поведение: `fetch(url, { method, headers, body: JSON.stringify(ctx) })`. При
`secret` добавляет заголовок `X-Signature: sha256=<HMAC-SHA256-hex>` для
верификации на принимающей стороне. 2xx → `ok`, иначе → `error` с кодом статуса.

### telegram

Конфиг: `botToken` (токен бота), `chatId` (id чата, может быть отрицательным).

Поведение: POST на `https://api.telegram.org/bot{token}/sendMessage` с
HTML-форматированным текстом (`formatTelegramMessage`): тип заявки, имя сайта,
поля, источник, ссылка на страницу. `parse_mode: "HTML"`.

### email

Конфиг: `to` (email-адрес получателя), `subject` (тема, опционально).

Поведение: отправка через **платформенный SMTP** (singleton nodemailer-транспорт,
`services/receivers/smtp.ts`). Если SMTP не сконфигурен (`SMTP_HOST`/`SMTP_PORT`
не заданы) — deliverer возвращает `{ ok: false, error: "SMTP не настроен" }`
(no-op, без исключения). Письмо содержит plaintext и HTML версии.

env SMTP (`packages/env/src/server.ts`):

| Переменная | Назначение |
|---|---|
| `SMTP_HOST` | Хост SMTP-сервера |
| `SMTP_PORT` | Порт (число) |
| `SMTP_USER` | Логин (опционально) |
| `SMTP_PASS` | Пароль (опционально) |
| `SMTP_FROM` | From-адрес (fallback: `SMTP_USER`, затем `no-reply@localhost`) |
| `SMTP_SECURE` | `"true"` → TLS, `"false"` (default) → STARTTLS |

Кеш транспорта создаётся при первом вызове и не сбрасывается без рестарта сервера.

## Admin UI

| Страница | Путь | Что делает |
|---|---|---|
| Список приёмщиков | `/tickets/receivers` | CRUD приёмщиков сайта + кнопка «Проверить» (тест-доставка) |
| Заявки (список) | `/tickets` | Ссылка «Приёмщики» в шапке |
| Деталь заявки | `/tickets/[id]` | Карточка «Доставка»: статус каждой строки, ретрай по одной или все с ошибками |
| Редактор модалки | `/modals/[id]` | Секция «Приёмщики» — выбор каких приёмщиков срабатывают для этой формы |

Config-редакторы: `apps/admin/app/components/receivers/{Webhook,Telegram,Email}ReceiverConfig.vue`.
Авторегистрируются по имени через `configRegistry.ts` — при добавлении нового
типа достаточно создать файл с именем `{Pascal}ReceiverConfig.vue`.

## Как добавить новый тип приёмщика

1. **Метаданные** — `packages/api/src/shared/receivers/{type}.ts`:

   ```ts
   import { z } from "zod";
   import { defineReceiver } from "./_core";

   export const myConfigSchema = z.object({ apiKey: z.string().min(1) });
   export type MyConfig = z.infer<typeof myConfigSchema>;

   export const myReceiver = defineReceiver<MyConfig>({
     type: "my-type",
     label: "My Service",
     icon: "i-solar-...-linear",
     description: "Короткое описание",
     configSchema: myConfigSchema,
     defaultConfig: { apiKey: "" },
   });
   ```

   Зарегистрировать в `packages/api/src/shared/receivers/index.ts`:
   добавить импорт `myReceiver` и вставить в `allReceivers`.

2. **Доставка** — `packages/api/src/services/receivers/{type}.ts`:

   ```ts
   import type { Deliverer } from "../../shared/receivers";
   import type { MyConfig } from "../../shared/receivers";

   export const deliverMy: Deliverer<MyConfig> = async (ctx, config) => {
     try {
       // ... вызов стороннего API ...
       return { ok: true };
     } catch (err) {
       return { ok: false, error: err instanceof Error ? err.message : String(err) };
     }
   };
   ```

   Зарегистрировать в `packages/api/src/services/receivers/index.ts`:
   добавить импорт `deliverMy` и запись `"my-type": deliverMy as Deliverer`
   в объект `deliverers`. Consistency-тест упадёт, если забыть эту строку.

3. **Config-редактор** — `apps/admin/app/components/receivers/MyTypeReceiverConfig.vue`:

   ```vue
   <script setup lang="ts">
   const model = defineModel<{ apiKey: string }>({ required: true });
   </script>

   <template>
     <UFormField label="API Key">
       <UInput :model-value="model.apiKey" @update:model-value="model = { ...model, apiKey: $event }" />
     </UFormField>
   </template>
   ```

   Авторегистрируется по имени (`{Pascal}ReceiverConfig.vue` → тип `my-type`).

## Миграция с legacy ticketSettings

Если в БД ещё есть таблица `ticket_settings` с Telegram-конфигом (старый формат),
перенести в `form_receivers`:

```bash
pnpm --filter server migrate:receivers
```

Скрипт `apps/server/src/scripts/migrate-receivers.ts`: идемпотентен (проверяет
существование таблицы и дубликата по `chatId`), создаёт telegram-приёмщик на
primary-сайте, проставляет его в `receiverIds` всех существующих модалок.
