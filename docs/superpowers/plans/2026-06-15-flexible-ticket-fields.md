# Гибкие поля заявки — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Хранить все поля формы структурно (`additionalInfo.fields`), валидировать обязательность по определению формы (телефон больше не обязателен глобально), показывать единым списком «Данные заявки», и кормить приёмщики полным набором полей.

**Architecture:** Чистый слой `ticket-fields.ts` (нормализация submit → валидация по форме → деривация колонок → отображение). Хендлер `public.tickets.create` использует его: валидирует против определения модалки, пишет `additionalInfo.fields` + деривированные колонки. `tickets.phone` → nullable. `buildDeliveryContext` и admin-деталь рендерят через общий `ticketDisplayFields`.

**Tech Stack:** Drizzle (PostgreSQL, `pnpm db:push`), oRPC + Zod, Hono, Nuxt 4 + reka-ui (web) / @nuxt/ui v4 (admin), Vitest.

**Spec:** [`docs/superpowers/specs/2026-06-15-flexible-ticket-fields-design.md`](../specs/2026-06-15-flexible-ticket-fields-design.md)

---

## Ключевые факты о кодовой базе (для исполнителя)

- **Миграции:** схема меняется правкой `packages/db/src/schema/*` + `pnpm db:push` (drizzle-kit push --force) из корня. SQL-миграций нет.
- **Тесты:** `pnpm test` (vitest) из корня; точечно `pnpm test -- <substr>`. Тесты рядом в `__tests__/`. DB в unit-тестах не поднимаем — тестируем чистые функции.
- **check-types baseline:** на main есть **6 пред-существующих ошибок** (`integration.ts`, `sections.ts`, `social-links.ts` ×2, `sync.ts` ×2) — НЕ из этой фичи. Критерий — ноль НОВЫХ.
- **Текущее состояние** (после #69, на main):
  - `public.tickets.create` — input с `phone: z.string().min(1)`, пишет фиксированные колонки, резолвит приёмщики по `source`, фоновая доставка. Полный текущий код — в [public/tickets.ts](../../../packages/api/src/routers/public/tickets.ts).
  - `buildDeliveryContext` ([payload.ts](../../../packages/api/src/services/receivers/payload.ts)) — строит `fields` из колонок; `ticket.phone` сейчас non-null.
  - `DeliveryContext.ticket.phone: string` ([shared/receivers/_core.ts](../../../packages/api/src/shared/receivers/_core.ts)).
  - Поля формы: `modalFieldSchema` (id/type/label/required/placeholder?/mask?), типы `name|phone|email|description|checkbox` ([shared/modal-fields.ts](../../../packages/api/src/shared/modal-fields.ts)).
  - Web-форма: `ModalProvider.collectTicketPayload`/`handleSubmit` ([ModalProvider.vue](../../../apps/web/app/components/ModalProvider.vue), строки 119-175).
  - Admin-деталь: карточки «Контактные данные»/«Сообщение»/«Детали»/«UTM»/«Доставка» ([tickets/[id].vue](../../../apps/admin/app/pages/tickets/[id].vue)).
- **@zhk/api экспорт:** wildcard `./*`→`./src/*.ts` — admin/web импортируют `@zhk/api/shared/<file>`.

## Структура файлов

**Новое:**
- `packages/api/src/shared/ticket-fields.ts` — типы + Zod-схема + чистые `normalizeSubmission`/`deriveTicketColumns`/`validateSubmission`/`ticketDisplayFields`
- `packages/api/src/shared/__tests__/ticket-fields.test.ts`

**Меняется:**
- `packages/db/src/schema/tickets.ts` — `phone` nullable, `additionalInfo` типизирован
- `packages/api/src/shared/receivers/_core.ts` — `DeliveryContext.ticket.phone` → `string | null`
- `packages/api/src/routers/public/tickets.ts` — input `fields`, валидация по форме, деривация, хранение
- `packages/api/src/services/receivers/payload.ts` — `buildDeliveryContext` через `ticketDisplayFields` + fallback
- `apps/web/app/components/ModalProvider.vue` — `collectFields` → шлёт `fields`
- `apps/admin/app/pages/tickets/[id].vue` — карточка «Данные заявки»
- `apps/admin/app/pages/tickets/index.vue` — колонка контакта (phone‖email‖name)

---

## Phase 1 — Чистый слой + схема

### Task 1: `ticket-fields.ts` — типы и чистые функции (TDD)

**Files:**
- Create: `packages/api/src/shared/ticket-fields.ts`
- Test: `packages/api/src/shared/__tests__/ticket-fields.test.ts`

- [ ] **Step 1: Падающий тест**

`packages/api/src/shared/__tests__/ticket-fields.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  normalizeSubmission,
  deriveTicketColumns,
  validateSubmission,
  ticketDisplayFields,
  type TicketField,
} from "../ticket-fields";

const F = (over: Partial<TicketField>): TicketField => ({
  key: "k", type: "name", label: "L", value: "v", ...over,
});

describe("normalizeSubmission", () => {
  it("возвращает input.fields как есть", () => {
    const fields = [F({ key: "1", type: "phone", label: "Телефон", value: "+7" })];
    expect(normalizeSubmission({ fields })).toEqual(fields);
  });
  it("синтезирует из плоских колонок (только непустые, с trim)", () => {
    expect(normalizeSubmission({ name: " Иван ", phone: "+7", email: "", message: "  " })).toEqual([
      { key: "name", type: "name", label: "Имя", value: "Иван" },
      { key: "phone", type: "phone", label: "Телефон", value: "+7" },
    ]);
  });
});

describe("deriveTicketColumns", () => {
  it("первый непустой строковый матч по типу; дубликаты — первый; чекбокс игнор", () => {
    const fields = [
      F({ type: "phone", label: "Тел агента", value: "+71" }),
      F({ type: "phone", label: "Тел клиента", value: "+72" }),
      F({ type: "email", label: "Почта", value: "a@b.ru" }),
      F({ type: "description", label: "Пожелания", value: "хочу студию" }),
      F({ type: "checkbox", label: "Согласие", value: true }),
    ];
    expect(deriveTicketColumns(fields)).toEqual({
      name: null, phone: "+71", email: "a@b.ru", message: "хочу студию",
    });
  });
  it("пустые/отсутствующие → null", () => {
    expect(deriveTicketColumns([F({ type: "name", value: "  " })])).toEqual({
      name: null, phone: null, email: null, message: null,
    });
  });
});

describe("validateSubmission", () => {
  const formDef = [
    { id: "n", type: "name", label: "Имя", required: false },
    { id: "e", type: "email", label: "Почта", required: true },
    { id: "p", type: "phone", label: "Телефон", required: false },
  ];
  it("обязательная почта заполнена → ok (телефона нет — норм)", () => {
    expect(validateSubmission([F({ key: "e", type: "email", value: "a@b.ru" })], formDef)).toEqual({ ok: true });
  });
  it("обязательная почта пуста → issue по её key", () => {
    const r = validateSubmission([F({ key: "n", type: "name", value: "Иван" })], formDef);
    expect(r.ok).toBe(false);
    expect((r as { issues: { key: string }[] }).issues.map((i) => i.key)).toContain("e");
  });
  it("заполненный email невалидного формата → issue", () => {
    const r = validateSubmission([F({ key: "e", type: "email", value: "не-почта" })], formDef);
    expect(r.ok).toBe(false);
  });
  it("обязательный непоставленный чекбокс → issue", () => {
    const def = [{ id: "c", type: "checkbox", label: "Согласие", required: true }];
    expect(validateSubmission([], def).ok).toBe(false);
    expect(validateSubmission([F({ key: "c", type: "checkbox", value: true })], def)).toEqual({ ok: true });
  });
  it("без формы → мягкий минимум: нужен телефон или почта", () => {
    expect(validateSubmission([F({ type: "name", value: "Иван" })], null).ok).toBe(false);
    expect(validateSubmission([F({ type: "phone", value: "+7" })], null)).toEqual({ ok: true });
  });
  it("форма ничего не требует + пусто → ok (намеренно)", () => {
    expect(validateSubmission([], [{ id: "n", type: "name", label: "Имя", required: false }])).toEqual({ ok: true });
  });
});

describe("ticketDisplayFields", () => {
  it("из additionalInfo.fields (чекбокс→Да, пустые отброшены)", () => {
    const ticket = {
      additionalInfo: { fields: [
        F({ type: "phone", label: "Тел", value: "+7" }),
        F({ type: "checkbox", label: "Согласие", value: true }),
        F({ type: "name", label: "Имя", value: "" }),
      ] },
      name: null, phone: null, email: null, message: null,
    };
    expect(ticketDisplayFields(ticket)).toEqual([
      { type: "phone", label: "Тел", value: "+7" },
      { type: "checkbox", label: "Согласие", value: "Да" },
    ]);
  });
  it("fallback на колонки для старых заявок", () => {
    const ticket = { additionalInfo: null, name: "Иван", phone: "+7", email: null, message: "привет" };
    expect(ticketDisplayFields(ticket)).toEqual([
      { type: "name", label: "Имя", value: "Иван" },
      { type: "phone", label: "Телефон", value: "+7" },
      { type: "description", label: "Сообщение", value: "привет" },
    ]);
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm test -- ticket-fields`
Expected: FAIL (нет модуля `../ticket-fields`).

- [ ] **Step 3: Реализовать `ticket-fields.ts`**

```ts
import { z } from "zod";

export const TICKET_FIELD_TYPES = ["name", "phone", "email", "description", "checkbox"] as const;
export type TicketFieldType = (typeof TICKET_FIELD_TYPES)[number];

export const ticketFieldSchema = z.object({
  key: z.string(),
  type: z.enum(TICKET_FIELD_TYPES),
  label: z.string(),
  value: z.union([z.string(), z.boolean()]),
});
export type TicketField = z.infer<typeof ticketFieldSchema>;
export const ticketFieldsSchema = z.array(ticketFieldSchema);

export interface FlatSubmission {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  message?: string | null;
}

function isFilled(f: TicketField): boolean {
  if (f.type === "checkbox") return f.value === true;
  return typeof f.value === "string" && f.value.trim().length > 0;
}

/** input.fields, либо синтез из плоских name/phone/email/message (только непустые). */
export function normalizeSubmission(
  input: { fields?: TicketField[] } & FlatSubmission,
): TicketField[] {
  if (input.fields && input.fields.length > 0) return input.fields;
  const out: TicketField[] = [];
  if (input.name?.trim()) out.push({ key: "name", type: "name", label: "Имя", value: input.name.trim() });
  if (input.phone?.trim()) out.push({ key: "phone", type: "phone", label: "Телефон", value: input.phone.trim() });
  if (input.email?.trim()) out.push({ key: "email", type: "email", label: "Email", value: input.email.trim() });
  if (input.message?.trim()) out.push({ key: "message", type: "description", label: "Сообщение", value: input.message.trim() });
  return out;
}

/** Первый непустой строковый матч по типу → первичные колонки. */
export function deriveTicketColumns(fields: TicketField[]): {
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
} {
  const first = (type: TicketFieldType): string | null => {
    const f = fields.find(
      (x) => x.type === type && typeof x.value === "string" && x.value.trim().length > 0,
    );
    return f ? (f.value as string).trim() : null;
  };
  return { name: first("name"), phone: first("phone"), email: first("email"), message: first("description") };
}

export interface FormFieldDef {
  id: string;
  type: string;
  label: string;
  required: boolean;
}
export type ValidationResult = { ok: true } | { ok: false; issues: { key: string; message: string }[] };

const emailOk = (v: string) => z.string().email().safeParse(v).success;

/** Валидация по определению формы; без формы — мягкий минимум (телефон ИЛИ почта). */
export function validateSubmission(
  fields: TicketField[],
  formDef: FormFieldDef[] | null,
): ValidationResult {
  const issues: { key: string; message: string }[] = [];

  // Формат email для любого заполненного email-поля.
  for (const f of fields) {
    if (f.type === "email" && typeof f.value === "string" && f.value.trim() && !emailOk(f.value.trim())) {
      issues.push({ key: f.key, message: "Некорректный email" });
    }
  }

  if (formDef) {
    for (const def of formDef) {
      if (!def.required) continue;
      const submitted = fields.find((f) => f.key === def.id);
      if (!submitted || !isFilled(submitted)) {
        issues.push({ key: def.id, message: `Поле «${def.label}» обязательно` });
      }
    }
  } else {
    const cols = deriveTicketColumns(fields);
    if (!cols.phone && !cols.email) {
      issues.push({ key: "_contact", message: "Нужен телефон или email" });
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true };
}

export interface DisplayField {
  type: TicketFieldType;
  label: string;
  value: string;
}

/** Поля для отображения: из additionalInfo.fields ИЛИ fallback на колонки (старые заявки). */
export function ticketDisplayFields(ticket: {
  additionalInfo: unknown;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
}): DisplayField[] {
  const ai = ticket.additionalInfo as { fields?: TicketField[] } | null;
  if (ai?.fields?.length) {
    return ai.fields
      .map((f) => ({
        type: f.type,
        label: f.label,
        value: f.type === "checkbox" ? (f.value ? "Да" : "") : String(f.value ?? ""),
      }))
      .filter((f) => f.value !== "");
  }
  const out: DisplayField[] = [];
  if (ticket.name) out.push({ type: "name", label: "Имя", value: ticket.name });
  if (ticket.phone) out.push({ type: "phone", label: "Телефон", value: ticket.phone });
  if (ticket.email) out.push({ type: "email", label: "Email", value: ticket.email });
  if (ticket.message) out.push({ type: "description", label: "Сообщение", value: ticket.message });
  return out;
}
```

- [ ] **Step 4: Запустить — проходит**

Run: `pnpm test -- ticket-fields`
Expected: PASS (все describe-блоки).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/shared/ticket-fields.ts packages/api/src/shared/__tests__/ticket-fields.test.ts
git commit -m "feat(api): чистый слой полей заявки (normalize/derive/validate/display) (#71)"
```

---

### Task 2: Схема — `phone` nullable, `additionalInfo` типизирован, `DeliveryContext.phone` nullable

**Files:**
- Modify: `packages/db/src/schema/tickets.ts:17-27`
- Modify: `packages/api/src/shared/receivers/_core.ts` (поле `phone` в DeliveryContext)

- [ ] **Step 1: `tickets.phone` → nullable + типизировать `additionalInfo`**

В `packages/db/src/schema/tickets.ts`:
- Добавить импорт типа в начало файла:

```ts
import type { TicketField } from "../../../api/src/shared/ticket-fields";
```

> Если кросс-пакетный импорт типа из `@zhk/api` неудобен в `@zhk/db` (циклическая зависимость пакетов), вместо него объявить локальный inline-тип: `$type<{ fields: { key: string; type: string; label: string; value: string | boolean }[] }>()`. Предпочесть inline-тип, чтобы `@zhk/db` не зависел от `@zhk/api`.

- Изменить строку `phone: text("phone").notNull(),` (строка 18) на:

```ts
  phone: text("phone"),
```

- Изменить `additionalInfo: jsonb("additional_info"),` (строка 27) на:

```ts
  additionalInfo: jsonb("additional_info").$type<{
    fields: { key: string; type: string; label: string; value: string | boolean }[];
  }>(),
```

- [ ] **Step 2: `DeliveryContext.ticket.phone` → nullable**

В `packages/api/src/shared/receivers/_core.ts`, в интерфейсе `DeliveryContext`, поле `phone: string;` заменить на:

```ts
    phone: string | null;
```

- [ ] **Step 3: Применить схему**

Run: `pnpm db:push`
Expected: drizzle-kit снимает NOT NULL с `tickets.phone`. Подтвердить ТОЛЬКО это изменение; на запросы про drop/truncate других объектов — НЕ соглашаться.

- [ ] **Step 4: Проверка типов**

Run: `pnpm check-types`
Expected: появятся ошибки в `payload.ts` (теперь `ticket.phone` может быть null, а код пушит его как string) — это ожидаемо, починим в Task 4. Кроме них и 6 пред-существующих — новых быть не должно. (Если хочется зелёного прямо сейчас — делать Task 4 сразу после.)

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema/tickets.ts packages/api/src/shared/receivers/_core.ts
git commit -m "feat(db): tickets.phone nullable + типизированный additionalInfo (#71)"
```

---

## Phase 2 — Сервер

### Task 3: Переписать `public.tickets.create` (fields → валидация по форме → деривация → хранение)

**Files:**
- Modify: `packages/api/src/routers/public/tickets.ts` (полная замена)

- [ ] **Step 1: Полностью заменить файл**

`packages/api/src/routers/public/tickets.ts`:

```ts
import { z } from "zod";
import { db } from "@zhk/db";
import { tickets, ticketTypeEnum, modals, formReceivers } from "@zhk/db/schema";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { captureUnexpected } from "@zhk/observability";
import { publicActiveSiteProcedure } from "../../index";
import { rateLimit } from "../../middleware/rate-limit";
import {
  ticketFieldsSchema,
  normalizeSubmission,
  deriveTicketColumns,
  validateSubmission,
  type FormFieldDef,
  type FlatSubmission,
  type TicketField,
} from "../../shared/ticket-fields";
import { resolveReceiverIds, createPendingDeliveries, processTicketDeliveries } from "../../services/receivers";

/** Извлекает slug модалки из source вида "modal:{slug}". */
function modalSlugFromSource(source: string | undefined): string | null {
  if (!source) return null;
  const m = /^modal:(.+)$/.exec(source);
  return m ? m[1]! : null;
}

/** Первый контакт (телефон, иначе почта) — для rate-limit дедупа. */
function contactKey(input: { fields?: TicketField[] } & FlatSubmission): string | undefined {
  const cols = deriveTicketColumns(normalizeSubmission(input));
  return cols.phone ?? cols.email ?? undefined;
}

export const publicTicketsRouter = {
  create: publicActiveSiteProcedure
    .use(rateLimit("ticketCreate", { keyBy: "ip+site" }))
    .use(rateLimit("ticketCreateHourly", { keyBy: "ip+site" }))
    .use(rateLimit("ticketCreate", {
      keyBy: "ip+extra",
      extractExtra: (input) => contactKey(input as { fields?: TicketField[] } & FlatSubmission),
    }))
    .input(
      z.object({
        // Новый структурный путь:
        fields: ticketFieldsSchema.optional(),
        // Legacy/программный путь (fallback):
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.union([z.string().email(), z.literal("")]).optional(),
        message: z.string().optional(),
        // Общее:
        type: z.enum(ticketTypeEnum.enumValues).default("lead"),
        source: z.string().optional(),
        url: z.string().optional(),
        utm: z.record(z.string(), z.string()).optional(),
        apartmentId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const siteId = context.siteId;
      const fields = normalizeSubmission(input);

      // Резолв формы: нужны и receiverIds (для приёмщиков), и fields (для валидации).
      const slug = modalSlugFromSource(input.source);
      const form = slug
        ? await db.query.modals.findFirst({
            where: and(eq(modals.siteId, siteId), eq(modals.slug, slug)),
            columns: { receiverIds: true, fields: true },
          })
        : null;

      const formDef = (form?.fields as FormFieldDef[] | undefined) ?? null;
      const validation = validateSubmission(fields, formDef);
      if (!validation.ok) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Проверьте поля формы",
          data: { issues: validation.issues },
        });
      }

      const cols = deriveTicketColumns(fields);

      const created = await db
        .insert(tickets)
        .values({
          siteId,
          name: cols.name,
          phone: cols.phone,
          email: cols.email,
          message: cols.message,
          additionalInfo: { fields },
          type: input.type,
          source: input.source ?? null,
          url: input.url ?? null,
          utm: input.utm ?? null,
          apartmentId: input.apartmentId ?? null,
        })
        .returning()
        .then((r) => r[0]!);

      // Резолв приёмщиков (форма → receiverIds, иначе все enabled).
      const enabled = await db.query.formReceivers.findMany({
        where: and(eq(formReceivers.siteId, siteId), eq(formReceivers.enabled, true)),
        orderBy: (r, { asc }) => [asc(r.sortOrder), asc(r.createdAt)],
      });
      const targetIds = resolveReceiverIds(form ?? null, enabled);
      const targets = enabled.filter((r) => targetIds.includes(r.id));

      if (targets.length > 0) {
        const deliveryIds = await createPendingDeliveries(
          created.id,
          targets.map((r) => ({ id: r.id, type: r.type, name: r.name })),
        );
        void processTicketDeliveries(created.id, deliveryIds).catch((err) =>
          captureUnexpected(err, { operation: "tickets.deliver", siteId }),
        );
      }

      return { success: true, id: created.id };
    }),
};
```

> Изменения: input принимает `fields` (+ phone стал optional); валидация по определению формы вместо хардкода `phone.min(1)`; колонки деривируются; `additionalInfo` хранит полный набор; rate-limit дедуп по первому контакту (phone‖email). Резолв приёмщиков/доставка — без изменений.

- [ ] **Step 2: Проверка типов**

Run: `pnpm --filter @zhk/api check-types`
Expected: без новых ошибок в этом файле (в `payload.ts` ошибки из Task 2 ещё есть — чиним в Task 4).

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routers/public/tickets.ts
git commit -m "feat(api): tickets.create — структурные поля, валидация по форме, деривация колонок (#71)"
```

---

### Task 4: `buildDeliveryContext` через `ticketDisplayFields` + fallback

**Files:**
- Modify: `packages/api/src/services/receivers/payload.ts` (полная замена)
- Test: `packages/api/src/services/receivers/__tests__/payload.test.ts` (дополнить)

- [ ] **Step 1: Дополнить тест payload новыми кейсами**

В `packages/api/src/services/receivers/__tests__/payload.test.ts` добавить describe-блок (рядом с существующими; существующие НЕ удалять):

```ts
import { buildDeliveryContext } from "../payload";

describe("buildDeliveryContext: additionalInfo.fields", () => {
  const base = {
    id: "t1", name: "Иван", phone: "+71", email: null, message: null,
    type: "lead", source: null, url: null,
    utm: null, apartmentId: null, requestType: null, comment: null,
    externalId: null, integrationId: null, siteId: "s1",
    createdAt: new Date("2026-06-15T10:00:00Z"), updatedAt: new Date("2026-06-15T10:00:00Z"),
  };
  it("берёт fields из additionalInfo (два телефона + чекбокс)", () => {
    const ticket = {
      ...base,
      additionalInfo: { fields: [
        { key: "p1", type: "phone", label: "Тел агента", value: "+71" },
        { key: "p2", type: "phone", label: "Тел клиента", value: "+72" },
        { key: "w", type: "description", label: "Пожелания", value: "студию" },
        { key: "c", type: "checkbox", label: "Согласие", value: true },
      ] },
    };
    const ctx = buildDeliveryContext(ticket as never, { id: "s1", name: "ЖК" });
    expect(ctx.fields).toEqual([
      { label: "Тел агента", value: "+71" },
      { label: "Тел клиента", value: "+72" },
      { label: "Пожелания", value: "студию" },
      { label: "Согласие", value: "Да" },
    ]);
  });
  it("fallback на колонки если additionalInfo пуст; phone=null безопасен", () => {
    const ticket = { ...base, phone: null, additionalInfo: null };
    const ctx = buildDeliveryContext(ticket as never, { id: "s1", name: "ЖК" });
    expect(ctx.ticket.phone).toBeNull();
    expect(ctx.fields).toEqual([{ label: "Имя", value: "Иван" }]);
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm test -- receivers/__tests__/payload`
Expected: FAIL (старый buildDeliveryContext не читает additionalInfo и падает на phone=null).

- [ ] **Step 3: Переписать `payload.ts`**

```ts
import type { tickets } from "@zhk/db/schema";
import type { DeliveryContext } from "../../shared/receivers";
import { ticketDisplayFields } from "../../shared/ticket-fields";

type TicketRow = typeof tickets.$inferSelect;

export function buildDeliveryContext(
  ticket: TicketRow,
  site: { id: string; name: string },
): DeliveryContext {
  const fields = ticketDisplayFields(ticket).map((f) => ({ label: f.label, value: f.value }));

  return {
    ticket: {
      id: ticket.id,
      name: ticket.name ?? null,
      phone: ticket.phone ?? null,
      email: ticket.email ?? null,
      message: ticket.message ?? null,
      type: ticket.type,
      source: ticket.source ?? null,
      url: ticket.url ?? null,
      createdAt: ticket.createdAt.toISOString(),
    },
    utm: (ticket.utm as Record<string, string> | null) ?? null,
    site,
    fields,
  };
}
```

- [ ] **Step 4: Запустить — проходит + полный набор**

Run: `pnpm test -- receivers/__tests__/payload` затем `pnpm test`
Expected: PASS (новые + существующие payload-тесты; общий набор зелёный).

> Если существующий payload-тест (из #69) ожидал RU-лейбл «Email» или формат старых полей — он совместим: `ticketDisplayFields` fallback даёт те же «Имя/Телефон/Email/Сообщение». Если какой-то старый ассерт отличается — обновить под новый источник (с сохранением смысла).

- [ ] **Step 5: Проверка типов**

Run: `pnpm check-types`
Expected: 6 пред-существующих, ноль новых (ошибки из Task 2 в payload.ts устранены).

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/services/receivers/payload.ts packages/api/src/services/receivers/__tests__/payload.test.ts
git commit -m "feat(api): DeliveryContext из additionalInfo.fields + fallback, phone nullable (#71)"
```

---

## Phase 3 — Клиент + Admin

### Task 5: ModalProvider шлёт структурные `fields`

**Files:**
- Modify: `apps/web/app/components/ModalProvider.vue` (collectTicketPayload → collectFields; handleSubmit)

- [ ] **Step 1: Заменить `collectTicketPayload` на `collectFields`**

В `apps/web/app/components/ModalProvider.vue` заменить функцию `collectTicketPayload` (строки 119-139) на:

```ts
function collectFields() {
  const fields: { key: string; type: string; label: string; value: string | boolean }[] = [];
  for (const field of effectiveFields.value) {
    const raw = formValues.value[field.id];
    if (field.type === "checkbox") {
      if (raw === true) fields.push({ key: field.id, type: field.type, label: field.label, value: true });
      continue;
    }
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) continue;
    fields.push({ key: field.id, type: field.type, label: field.label, value });
  }
  return fields;
}
```

- [ ] **Step 2: Обновить `handleSubmit`**

В `handleSubmit` заменить блок `const payload = collectTicketPayload(); await $orpcClient.public.tickets.create({ ...payload, type: "callback", ... })` на:

```ts
    const fields = collectFields();
    await $orpcClient.public.tickets.create({
      fields,
      type: "callback",
      source: `modal:${activeModalSlug.value ?? ""}`,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });
```

(остальное в `handleSubmit` — без изменений, включая обработку ошибок и анимацию успеха.)

- [ ] **Step 3: Проверка типов (по возможности)**

Run: `pnpm check-types`
Expected: без новых ошибок в .ts. (SFC не валидируется check-types — проверка в браузере в Task 8.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/ModalProvider.vue
git commit -m "feat(web): форма шлёт структурный набор полей (fields) (#71)"
```

---

### Task 6: Admin — карточка «Данные заявки» + колонка контакта в списке

**Files:**
- Modify: `apps/admin/app/pages/tickets/[id].vue`
- Modify: `apps/admin/app/pages/tickets/index.vue`

- [ ] **Step 1: В детали заявки — заменить карточки «Контактные данные» и «Сообщение» на «Данные заявки»**

В `apps/admin/app/pages/tickets/[id].vue`, в `<script setup>` добавить импорт и computed:

```ts
import { ticketDisplayFields } from "@zhk/api/shared/ticket-fields";

const fields = computed(() => (ticket.value ? ticketDisplayFields(ticket.value as any) : []));
```

В шаблоне удалить блок «Контактные данные» (`<div ... Контактные данные ...>`) и блок «Сообщение» (`<div v-if="ticket.message" ...>`), и на их место (первой карточкой в `max-w-2xl space-y-6`) вставить:

```vue
        <!-- Данные заявки -->
        <div class="border border-(--ui-border) p-6 space-y-3">
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Данные заявки</h2>
          <div v-for="(f, i) in fields" :key="i" class="grid grid-cols-[160px_1fr] gap-3 text-sm">
            <div class="text-(--ui-text-dimmed)" v-html="f.label" />
            <div class="text-(--ui-text-highlighted) break-words">
              <a v-if="f.type === 'phone'" :href="`tel:${f.value.replace(/[^+\d]/g, '')}`" class="text-(--ui-primary) hover:underline">{{ f.value }}</a>
              <a v-else-if="f.type === 'email'" :href="`mailto:${f.value}`" class="text-(--ui-primary) hover:underline">{{ f.value }}</a>
              <span v-else class="whitespace-pre-wrap">{{ f.value }}</span>
            </div>
          </div>
          <p v-if="!fields.length" class="text-sm text-(--ui-text-muted)">Нет данных</p>
        </div>
```

> `v-html` на label — потому что чекбокс-согласие хранит HTML в label (как в форме). Источник — собственная форма сайта, не пользовательский ввод произвольного origin.

- [ ] **Step 2: В списке заявок — колонка контакта phone‖email‖name**

В `apps/admin/app/pages/tickets/index.vue`, в колонке `phone` (cell, строки ~76-81) заменить рендер значения на fallback. Заменить:

```ts
    cell: ({ row }) =>
      h("span", { class: "font-medium text-(--ui-text-highlighted)" }, row.getValue("phone")),
```

на:

```ts
    cell: ({ row }) => {
      const r = row.original as { phone?: string; email?: string; name?: string };
      return h("span", { class: "font-medium text-(--ui-text-highlighted)" }, r.phone || r.email || r.name || "—");
    },
```

- [ ] **Step 3: Проверка типов**

Run: `pnpm check-types`
Expected: 6 пред-существующих, ноль новых в .ts.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/pages/tickets/[id].vue apps/admin/app/pages/tickets/index.vue
git commit -m "feat(admin): карточка «Данные заявки» + контакт-fallback в списке (#71)"
```

- [ ] **Step 5: Прогнать весь набор тестов**

Run: `pnpm test`
Expected: все зелёные.

---

## Phase 4 — Документация и проверка

### Task 7: Документация

**Files:**
- Modify: `docs/receivers.md` (раздел про `DeliveryContext`/`fields`)
- Modify: `CLAUDE.md` (раздел про заявки/приёмщики — короткое дополнение)

- [ ] **Step 1: Обновить docs/receivers.md**

В разделе про `DeliveryContext` отметить, что `fields` теперь берётся из `additionalInfo.fields` заявки (полный набор полей формы, включая дубликаты и кастомные), fallback на колонки для старых заявок. Добавить короткий раздел «Поля заявки» со ссылкой на спеку `2026-06-15-flexible-ticket-fields-design.md`: гибрид-хранение, валидация по форме (телефон необязателен), `tickets.phone` nullable.

- [ ] **Step 2: Дополнить CLAUDE.md**

В разделе про приёмщики/заявки добавить 2-3 строки: поля формы хранятся структурно в `tickets.additionalInfo.fields`; обязательность задаётся в билдере и валидируется сервером по определению формы; чистый слой — `packages/api/src/shared/ticket-fields.ts`.

- [ ] **Step 3: Commit**

```bash
git add docs/receivers.md CLAUDE.md
git commit -m "docs(tickets): гибкие поля заявки — дока (#71)"
```

---

### Task 8: E2E-проверка через preview

> Как в #69: preview-стек (server :3000 c `RL_ENABLED=false` если Redis не поднят / admin :3002 / web :3001), реальная БД. После правки схемы — `pnpm db:push` уже применён.

- [ ] **Step 1: Поднять preview** (server/web/admin) — стек уже использовался для #69.

- [ ] **Step 2: Форма без телефона, обязательная почта** — в модалке убрать phone-поле, сделать email required (или взять такую модалку), submit через сайт → **200**, тикет создан с `phone IS NULL`, доставка ok. (Прямой регресс исходного бага.)

- [ ] **Step 3: Два телефона + «Пожелания»** — модалка с двумя phone-полями (Тел агента/клиента) и description-полем «Пожелания»; submit → проверить `additionalInfo.fields` в БД (оба телефона + пожелание + согласие), карточку «Данные заявки» в `/tickets/{id}` (все поля, tel:/mailto: кликабельны), и что приёмщики (webhook.site/Telegram/Mailpit) получили полный набор полей.

- [ ] **Step 4: Пустое обязательное поле** — submit мимо клиента (curl) с незаполненным required-полем → **400** с `issues` по нужному `key`.

- [ ] **Step 5: Старая заявка** — заявка без `additionalInfo.fields` (из БД) рендерится в детали через fallback на колонки.

- [ ] **Step 6: Зафиксировать** результаты в комментарии к #71 и обновить память (заметка про feat/71).

---

## Self-Review (выполнено при написании плана)

- **Spec coverage:** TicketField+чистые функции (Task 1), schema phone nullable + additionalInfo (Task 2), submit-контракт fields + валидация по форме + деривация + хранение (Task 3), buildDeliveryContext из fields + fallback (Task 4), ModalProvider fields (Task 5), единый список «Данные заявки» + контакт-fallback (Task 6), rate-limit phone‖email (Task 3 contactKey), docs (Task 7), E2E (Task 8). Мягкий минимум, формат email, чекбокс — покрыты тестами Task 1. Пробелов нет.
- **Placeholder scan:** код во всех code-шагах полный; нет TBD.
- **Type consistency:** `TicketField`/`FormFieldDef`/`FlatSubmission`/`ValidationResult`/`DisplayField` — из `ticket-fields.ts`; `normalizeSubmission`/`deriveTicketColumns`/`validateSubmission`/`ticketDisplayFields` — имена едины между Task 1, 3, 4, 6. `additionalInfo: { fields }` — единая форма в Task 2/3/4/6.
- **Точки внимания:** (1) Task 2 — предпочесть inline-тип для `additionalInfo`, чтобы `@zhk/db` не зависел от `@zhk/api` (циклическая зависимость пакетов); (2) Task 2 оставляет временную ошибку типов в payload.ts до Task 4 — порядок Task 3→4 это закрывает; (3) старый payload-тест из #69 может требовать мелкой подгонки ассерта под новый источник fields (Task 4 Step 4).
