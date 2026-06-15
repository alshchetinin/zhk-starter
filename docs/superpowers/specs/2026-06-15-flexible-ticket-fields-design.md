# Гибкие поля заявки

**Issue:** [#71](https://github.com/alshchetinin/zhk-starter/issues/71)
**Дата:** 2026-06-15
**Статус:** дизайн
**Зависит от:** #69 (приёмщики форм, влит в main)

## Проблема

Данные формы сейчас схлопываются в фиксированные колонки тикета. `collectTicketPayload`
([ModalProvider.vue:119](../../../apps/web/app/components/ModalProvider.vue)) маппит `name/phone/email`,
`description`→`message`, чекбоксы пропускает, остальное кладёт текстом в `message`. Сервер
([public/tickets.ts](../../../packages/api/src/routers/public/tickets.ts)) жёстко требует `phone.min(1)`.

Следствия:
- **Два поля одного типа коллизят** — две «телефон»-поля (агента и клиента) пишутся в одну колонку `phone`, последнее перезаписывает.
- **Кастомные поля теряют структуру** — поле «Пожелания» уходит строкой в `message`, не отображается отдельно.
- **`required`-флаги формы сервер игнорирует** — обязательность задаётся в билдере (поле `required` у каждого поля), но сервер проверяет только свой хардкод `phone`.
- **Форма без телефона молча падает 400** — `phone:""` не проходит `phone.min(1)`, а `ModalProvider` показывает ошибку только для 429 (последнее уже поправлено в #69, коммит `300f2ac`).

В таблице `tickets` уже есть **неиспользуемая колонка `additionalInfo` (JSONB)** — естественный дом для структурных полей.

## Цель

Поля формы — гибкие. Телефон не обязателен (обязательность задаёт билдер), произвольные и
дублирующиеся поля сохраняются структурно и аккуратно показываются в заявке. Форма — источник
истины о наборе и обязательности полей.

## Решения (из брейншторма)

| Решение | Выбор |
| --- | --- |
| Хранение | **Гибрид** — все поля структурно в `additionalInfo.fields`; первичные контакты дублируются в колонки name/phone/email/message |
| Валидация | **По определению формы** — сервер грузит форму по `source`, проверяет required-поля; мягкий минимум (телефон ИЛИ почта) для заявок без формы |
| Типы полей | Не трогаем (5: name/phone/email/description/checkbox), разрешаем дубликаты, «пожелания» через `description` |
| Отображение | Единый список «Данные заявки» (label: value в порядке формы), заменяет карточки «Контакты»/«Сообщение» |
| Схема | `tickets.phone` → nullable |

## Не-цели (вне скоупа)

- **Новые типы полей** (select/number/date/textarea) — YAGNI, остаются 5.
- **Миграция старых заявок** — `additionalInfo.fields` начинает заполняться с релиза; старые заявки рендерятся через fallback на колонки.
- **Изменение CRM-синка** — он не создаёт тикеты через этот oRPC (пишет в БД напрямую).
- **Конфигурируемое required «хотя бы одно из N»** на уровне формы — пока только пер-полевой `required` + глобальный мягкий минимум.

## Архитектура

### Контракт данных

**`TicketField`** — единица структурного поля (изоморфный тип, рядом с `modal-fields.ts`):

```ts
interface TicketField {
  key: string;          // id поля формы (для сверки с определением и трассировки)
  type: "name" | "phone" | "email" | "description" | "checkbox";
  label: string;        // человекочитаемая подпись из формы
  value: string | boolean;
}
```

Хранится в `tickets.additionalInfo` как `{ fields: TicketField[] }`.

### A. Submit-контракт (клиент → сервер)

`public.tickets.create` input расширяется (обратносовместимо):

```ts
{
  type: TicketType,            // default "lead"
  source?: string,
  url?: string,
  utm?: Record<string,string>,
  apartmentId?: string,
  fields?: TicketField[],      // НОВОЕ — структурный набор полей формы
  // legacy/программный путь (fallback):
  name?: string, phone?: string, email?: string | "", message?: string,
}
```

`ModalProvider.collectTicketPayload` собирает `fields` из `effectiveFields` + `formValues`
(каждое поле формы → `{key: field.id, type, label, value}`, включая дубликаты и чекбоксы как `boolean`).
Шлёт `{ fields, type, source, url }`. Клиентская required-валидация (`isValid`) остаётся — сервер
лишь авторитетный гейт.

### B. Сервер: нормализация → валидация → деривация → хранение

В хендлере `create`:

1. **Нормализация набора полей.** Если `input.fields` есть — берём его. Иначе синтезируем минимальный
   массив из плоских `name/phone/email/message` (back-compat для программных вызовов). Дальше работаем с
   единым `fields: TicketField[]`.

2. **Резолв формы** по `source` (`modal:{slug}`) — уже делается для приёмщиков ([public/tickets.ts](../../../packages/api/src/routers/public/tickets.ts)).
   Даёт определения полей формы (`modalFieldsSchema`: id/type/label/required).

3. **Валидация** (чистая `validateSubmission(fields, formDef)`):
   - `formDef` задан → для каждого поля с `required=true` найти отправленное по `key === def.id` и
     проверить непустоту: чекбокс → `value === true`; `email`-тип → валидный email; прочее → `trim().length > 0`.
   - `formDef` нет (нет `source`/формы) → мягкий минимум: после деривации хотя бы один из `phone`/`email` непуст.
   - Ошибка → `ORPCError("BAD_REQUEST", { data: { issues: [{key, message}] } })`.
   - **Намеренно:** если форма не требует ничего (`required=false` у всех полей), пустая отправка допустима — обязательность задаёт автор формы. Защита от спама — на rate-limit, а не здесь.

4. **Деривация колонок** (чистая `deriveTicketColumns(fields)`): первый непустой `name`→`name`,
   `phone`→`phone`, `email`→`email`, `description`→`message`. Остальные/дубликаты — только в `fields`.

5. **Хранение**: `additionalInfo = { fields }`, плюс деривированные колонки. (Резолв приёмщиков, pending-строки
   и фоновая доставка — без изменений из #69.)

### C. Схема БД

`tickets.phone` → **nullable** (снять `.notNull()` в [tickets.ts](../../../packages/db/src/schema/tickets.ts), `pnpm db:push`).
Миграции данных не нужно.

### D. Отображение (деталь заявки)

Карточка **«Данные заявки»** в [tickets/[id].vue](../../../apps/admin/app/pages/tickets/[id].vue):
рендерит `ticket.additionalInfo.fields` в порядке формы — `label: value`. `phone`→`tel:`-ссылка,
`email`→`mailto:`, `checkbox`→«Да»/«Нет», текст как есть. Заменяет карточки «Контакты» и «Сообщение».
Карточки «Детали» (type/дата/source/url + UTM) и «Доставка» остаются.

**Fallback для старых заявок** (нет `additionalInfo.fields`): рендерить как сейчас — из колонок
name/phone/email/message. Чистый хелпер `ticketDisplayFields(ticket)` возвращает массив `{label,value,type}`
из `additionalInfo.fields` ИЛИ из колонок.

Список заявок ([tickets/index.vue](../../../apps/admin/app/pages/tickets/index.vue)): колонка «Телефон»
показывает `phone`, иначе `email`, иначе `name`, иначе «—».

### E. Приёмщики (буст того, что сделано в #69)

`buildDeliveryContext` ([services/receivers/payload.ts](../../../packages/api/src/services/receivers/payload.ts)):
если `ticket.additionalInfo.fields` есть — строить `DeliveryContext.fields` из него (полный набор: два
телефона, кастомные поля; `value` → строка, чекбокс → «Да»/«Нет», пустые пропускаем). Иначе — текущая
деривация из колонок (старые/программные тикеты). Webhook/Telegram/Email автоматически получают все поля.

### F. Rate-limit

`ticketCreate` ip+extra дедуп сейчас по `input.phone` ([public/tickets.ts](../../../packages/api/src/routers/public/tickets.ts),
`extractExtra`). Телефон стал опциональным → `extractExtra` возвращает первый контакт: деривированный
`phone`, иначе `email`. Если ни того ни другого — лимитер пропускает (возврат `undefined`); ip+site
лимитеры остаются.

## Чистые функции (ядро, юнит-тестируемые)

- `normalizeSubmission(input): TicketField[]` — `input.fields` или синтез из плоских колонок.
- `deriveTicketColumns(fields): { name, phone, email, message }` — первый непустой матч по типу.
- `validateSubmission(fields, formDef | null): { ok: true } | { ok: false; issues: {key,message}[] }`.
- `ticketDisplayFields(ticket): { label, value, type }[]` (web/admin) — из `additionalInfo.fields` или fallback на колонки.
- `deliveryFieldsFromTicket(ticket)` — обновление внутри `buildDeliveryContext`.

## Карта файлов

**Новое:**
- `packages/api/src/shared/ticket-fields.ts` — тип `TicketField` (переиспользует enum типов из `modal-fields.ts`) + Zod-схема + `normalizeSubmission`/`deriveTicketColumns`/`validateSubmission` (чистые). `modal-fields.ts` менять не нужно — только импортируем оттуда union типов.
- тесты `packages/api/src/shared/__tests__/ticket-fields.test.ts`
- `apps/web/app/utils/ticket-fields.ts` или admin `utils/` — `ticketDisplayFields` (+ тест если в api)

**Меняется:**
- `packages/db/src/schema/tickets.ts` — `phone` nullable; `$type<{ fields: TicketField[] }>()` для `additionalInfo`
- `packages/api/src/routers/public/tickets.ts` — input `fields`, нормализация, валидация по форме, деривация, хранение `additionalInfo`, `extractExtra` по phone||email
- `packages/api/src/services/receivers/payload.ts` — `buildDeliveryContext` из `additionalInfo.fields` + fallback
- `apps/web/app/components/ModalProvider.vue` — `collectTicketPayload` шлёт `fields`
- `apps/admin/app/pages/tickets/[id].vue` — карточка «Данные заявки» + fallback
- `apps/admin/app/pages/tickets/index.vue` — колонка контакта (phone||email||name)

## Тестирование

- **Чистые функции** (vitest): `validateSubmission` (required заполнен/пуст, формат email, чекбокс required, мягкий минимум без формы), `deriveTicketColumns` (первый матч, дубликаты, пустые → null), `normalizeSubmission` (fields vs плоские), `ticketDisplayFields` (из fields / fallback).
- **buildDeliveryContext** — из `additionalInfo.fields` (включая два телефона/кастомные) и fallback на колонки.
- **E2E** (preview + браузер, как в #69): форма без телефона с обязательной почтой → submit ok, тикет без phone, доставка ok; форма с двумя телефонами + «Пожелания» → оба телефона и пожелание в `additionalInfo.fields`, в карточке «Данные заявки» и во всех приёмщиках; пустое обязательное поле → сервер 400 с указанием поля.

## Совместимость

- **Старые заявки** (без `additionalInfo.fields`): деталь и приёмщики работают через fallback на колонки.
- **Программные вызовы** с плоскими `name/phone/email`: нормализуются в `fields`, валидируются мягким минимумом.
- **Контракт `public.tickets.create`**: `fields` добавлено опционально, плоские поля сохранены — обратносовместимо.
