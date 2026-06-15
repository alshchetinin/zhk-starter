# Расширяемая система приёмщиков форм — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить захардкоженную Telegram-отправку заявок на реестр приёмщиков (webhook/telegram/email), настраиваемых per-site, выбираемых каждой формой, с логом доставок и ручным ретраем.

**Architecture:** Реестр `defineReceiver` (метаданные изоморфны / `deliver` server-only, 1 тип = 2 файла). Таблицы `form_receivers` (per-site) + `form_deliveries` (лог), `modals.receiverIds`. Хендлер `public.tickets.create` сохраняет тикет, резолвит приёмщики по `source` на сервере, пишет `pending`-строки доставки и запускает доставку фоном. Лог и ретрай — в админке.

**Tech Stack:** Drizzle ORM (PostgreSQL, dev-workflow `pnpm db:push`), oRPC + Zod, Hono (Node, :3000), Nuxt 4 + @nuxt/ui v4 (admin), Vitest, nodemailer (новая зависимость).

**Spec:** [`docs/superpowers/specs/2026-06-15-form-receivers-design.md`](../specs/2026-06-15-form-receivers-design.md)

---

## Ключевые факты о кодовой базе (для исполнителя)

- **Миграции БД:** проект НЕ использует SQL-миграции в обычном цикле. Схема меняется правкой файлов в `packages/db/src/schema/*` и применяется `pnpm db:push` (drizzle-kit push --force) из корня. Экспорт таблицы — добавить `export * from "./<file>"` в `packages/db/src/schema/index.ts`.
- **Тесты:** `pnpm test` (vitest run) из корня. Тесты — рядом, в `__tests__/`, паттерн `describe/it/expect` (см. `packages/api/src/shared/__tests__/site-gate.test.ts`). DB в unit-тестах НЕ поднимаем — тестируем чистые функции и deliver'ы с замоканным `fetch`/nodemailer.
- **Реестр-паттерн:** см. блоки — `packages/api/src/shared/blocks/_core.ts` (`defineBlock`) + `index.ts` (`allBlocks`). Зеркалим для приёмщиков.
- **oRPC-процедуры** (`packages/api/src/index.ts`): `protectedProcedure` (авторизация, НЕ site-scoped), `siteProcedure` (auth + `context.siteId`), `publicActiveSiteProcedure` (публичная, есть `context.site` и `context.siteId`). Роутеры регистрируются в `packages/api/src/routers/index.ts` (`appRouter`) и `packages/api/src/routers/public/index.ts` (`publicRouter`).
- **Admin data-fetching:** vue-query + `$orpc`/`$orpcClient` из `useNuxtApp()`. `$orpc.<entity>.<proc>.queryOptions({input})` для `useQuery`; `$orpcClient.<entity>.<proc>(input)` для мутаций; `$orpc.<entity>.key()` для инвалидации. Только `@nuxt/ui` компоненты. Иконки `i-solar-*-linear`.
- **Авторегистрация admin-редакторов:** `import.meta.glob` по имени файла (см. `apps/admin/app/components/blocks/editors/index.ts`).
- **Текущая отправка Telegram:** inline-функция `sendTelegramNotification` в `packages/api/src/routers/public/tickets.ts` — будет удалена. Базовый Telegram-fetch есть и в `packages/api/src/services/notify.ts::sendTelegramMessage`.
- **ВАЖНО (готча @nuxt/ui v4):** `USelect`/reka-ui запрещает `items` с `value: ""`. Для «все/любой» — непустой сентинел (напр. `_all`), маппить в undefined.

---

## Структура файлов

**Метаданные приёмщиков (изоморфны)** — `packages/api/src/shared/receivers/`:
- `_core.ts` — `defineReceiver`, типы `ReceiverDefinition`, `DeliveryContext`, `DeliveryResult`
- `webhook.ts`, `telegram.ts`, `email.ts` — метаданные + configSchema каждого типа
- `index.ts` — `allReceivers`, `receiverDefByType`, `receiverTypes`, валидатор `parseReceiverConfig`
- `__tests__/registry.test.ts`, `__tests__/config.test.ts`

**Доставка (server-only)** — `packages/api/src/services/receivers/`:
- `payload.ts` — `buildDeliveryContext` (чистая)
- `resolve.ts` — `resolveReceiverIds` (чистая)
- `webhook.ts`, `telegram.ts`, `email.ts` — `deliver*` функции
- `smtp.ts` — ленивый nodemailer-транспорт (мокабельно)
- `index.ts` — `deliverers: Record<type, Deliverer>`
- `dispatch.ts` — `processTicketDeliveries`, `createPendingDeliveries`
- `__tests__/{payload,resolve,webhook,telegram,email,deliverers}.test.ts`

**БД** — `packages/db/src/schema/`:
- `form-receivers.ts`, `form-deliveries.ts` (новые), `_enums.ts` (+ `deliveryStatusEnum`), `modals.ts` (+ `receiverIds`), `index.ts` (экспорт)

**API-роутеры** — `packages/api/src/routers/`:
- `form-receivers.ts` (новый), `tickets.ts` (+ deliveries/retry), `modals.ts` (+ receiverIds), `public/tickets.ts` (переписать), `index.ts` (регистрация, убрать ticketSettings)

**env** — `packages/env/src/server.ts` (+ `SMTP_*`)

**Admin** — `apps/admin/app/`:
- `components/receivers/{Webhook,Telegram,Email}ReceiverConfig.vue` + `components/receivers/configRegistry.ts`
- `pages/tickets/receivers.vue` (новая), `pages/tickets/index.vue` (ссылка), `pages/tickets/[id].vue` (карточка доставки), `pages/modals/[id].vue` (секция приёмщиков)
- `utils/receivers.ts` (лейблы/иконки типов и статусов)

**Backfill + удаление legacy:**
- `apps/server/src/scripts/migrate-receivers.ts` (+ script в `apps/server/package.json`)
- удалить: `packages/db/src/schema/ticket-settings.ts`, `packages/api/src/routers/ticket-settings.ts`, `apps/admin/app/pages/tickets/settings.vue`

---

## Phase 1 — Модель данных + реестр метаданных

### Task 1: enum `delivery_status` + таблицы `form_receivers` / `form_deliveries` + `modals.receiverIds`

**Files:**
- Modify: `packages/db/src/schema/_enums.ts`
- Create: `packages/db/src/schema/form-receivers.ts`
- Create: `packages/db/src/schema/form-deliveries.ts`
- Modify: `packages/db/src/schema/modals.ts:15-39`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Добавить enum статуса доставки**

В конец `packages/db/src/schema/_enums.ts`:

```ts
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "ok",
  "error",
]);
```

- [ ] **Step 2: Создать таблицу `form_receivers`**

`packages/db/src/schema/form-receivers.ts`:

```ts
import { relations } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sites } from "./sites";

export const formReceivers = pgTable("form_receivers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  name: text("name").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const formReceiversRelations = relations(formReceivers, ({ one }) => ({
  site: one(sites, {
    fields: [formReceivers.siteId],
    references: [sites.id],
  }),
}));
```

- [ ] **Step 3: Создать таблицу `form_deliveries`**

`packages/db/src/schema/form-deliveries.ts`:

```ts
import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { deliveryStatusEnum } from "./_enums";
import { tickets } from "./tickets";
import { formReceivers } from "./form-receivers";

export const formDeliveries = pgTable("form_deliveries", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ticketId: text("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id").references(() => formReceivers.id, {
    onDelete: "set null",
  }),
  receiverType: text("receiver_type").notNull(),
  receiverName: text("receiver_name").notNull(),
  status: deliveryStatusEnum("status").notNull().default("pending"),
  error: text("error"),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const formDeliveriesRelations = relations(formDeliveries, ({ one }) => ({
  ticket: one(tickets, {
    fields: [formDeliveries.ticketId],
    references: [tickets.id],
  }),
  receiver: one(formReceivers, {
    fields: [formDeliveries.receiverId],
    references: [formReceivers.id],
  }),
}));
```

- [ ] **Step 4: Добавить `receiverIds` в `modals`**

В `packages/db/src/schema/modals.ts` добавить импорт массива из pg-core и колонку. Изменить строку импорта (строка 2):

```ts
import { jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
```

После `fields` (строка 28) добавить:

```ts
  receiverIds: text("receiver_ids").array().notNull().default([]),
```

- [ ] **Step 5: Экспортировать новые таблицы**

В `packages/db/src/schema/index.ts` после строки `export * from "./modals";` добавить:

```ts
export * from "./form-receivers";
export * from "./form-deliveries";
```

- [ ] **Step 6: Применить схему к БД**

Run: `pnpm db:push`
Expected: drizzle-kit применяет изменения без ошибок (создаёт `form_receivers`, `form_deliveries`, enum `delivery_status`, колонку `modals.receiver_ids`). Если спросит про truncation/data-loss по существующим таблицам — НЕ подтверждать ничего, кроме добавления новых объектов.

- [ ] **Step 7: Проверка типов**

Run: `pnpm --filter @zhk/db check-types` (или `pnpm check-types` из корня)
Expected: без ошибок.

- [ ] **Step 8: Commit**

```bash
git add packages/db/src/schema
git commit -m "feat(db): таблицы form_receivers/form_deliveries + modals.receiverIds (#69)"
```

---

### Task 2: Реестр метаданных приёмщиков (`defineReceiver`, типы, configSchema)

**Files:**
- Create: `packages/api/src/shared/receivers/_core.ts`
- Create: `packages/api/src/shared/receivers/webhook.ts`
- Create: `packages/api/src/shared/receivers/telegram.ts`
- Create: `packages/api/src/shared/receivers/email.ts`
- Create: `packages/api/src/shared/receivers/index.ts`
- Test: `packages/api/src/shared/receivers/__tests__/config.test.ts`

- [ ] **Step 1: Написать падающий тест на configSchema**

`packages/api/src/shared/receivers/__tests__/config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseReceiverConfig, receiverTypes, receiverDefByType } from "../index";

describe("receiver configSchema", () => {
  it("webhook требует валидный url", () => {
    expect(() => parseReceiverConfig("webhook", { url: "not-a-url" })).toThrow();
    const ok = parseReceiverConfig("webhook", { url: "https://example.com/hook" });
    expect(ok).toMatchObject({ url: "https://example.com/hook", method: "POST" });
  });

  it("telegram требует botToken и chatId", () => {
    expect(() => parseReceiverConfig("telegram", { botToken: "x" })).toThrow();
    const ok = parseReceiverConfig("telegram", { botToken: "123:abc", chatId: "-100" });
    expect(ok).toEqual({ botToken: "123:abc", chatId: "-100" });
  });

  it("email требует to (email)", () => {
    expect(() => parseReceiverConfig("email", { to: "nope" })).toThrow();
    const ok = parseReceiverConfig("email", { to: "sales@a.ru" });
    expect(ok).toMatchObject({ to: "sales@a.ru" });
  });

  it("неизвестный тип кидает ошибку", () => {
    expect(() => parseReceiverConfig("sms", {})).toThrow(/unknown receiver type/i);
  });

  it("реестр перечисляет все 3 типа", () => {
    expect(new Set(receiverTypes)).toEqual(new Set(["webhook", "telegram", "email"]));
    expect(receiverDefByType.get("webhook")?.label).toBeTruthy();
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pnpm test -- receivers/config`
Expected: FAIL (модуль `../index` не существует).

- [ ] **Step 3: Реализовать `_core.ts`**

`packages/api/src/shared/receivers/_core.ts`:

```ts
import type { z } from "zod";

/** Стабильный контракт, который получает каждый приёмщик. */
export interface DeliveryContext {
  ticket: {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    message: string | null;
    type: string;
    source: string | null;
    url: string | null;
    createdAt: string;
  };
  utm: Record<string, string> | null;
  site: { id: string; name: string };
  /** Человекочитаемые поля (label/value) — для форматирования Telegram/email. */
  fields: Array<{ label: string; value: string }>;
}

export type DeliveryResult = { ok: true } | { ok: false; error: string };

export type Deliverer<C = unknown> = (
  ctx: DeliveryContext,
  config: C,
) => Promise<DeliveryResult>;

export interface ReceiverDefinition<C = unknown> {
  type: string;
  label: string;
  icon: string;
  description: string;
  configSchema: z.ZodType<C>;
  defaultConfig: C;
}

export function defineReceiver<C>(
  def: ReceiverDefinition<C>,
): ReceiverDefinition<C> {
  return def;
}
```

- [ ] **Step 4: Реализовать метаданные webhook**

`packages/api/src/shared/receivers/webhook.ts`:

```ts
import { z } from "zod";
import { defineReceiver } from "./_core";

export const webhookConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(["POST", "PUT"]).default("POST"),
  headers: z.record(z.string(), z.string()).optional(),
  secret: z.string().optional(),
});

export type WebhookConfig = z.infer<typeof webhookConfigSchema>;

export const webhookReceiver = defineReceiver<WebhookConfig>({
  type: "webhook",
  label: "Webhook",
  icon: "i-solar-link-circle-linear",
  description: "POST JSON с данными заявки на ваш URL",
  configSchema: webhookConfigSchema,
  defaultConfig: { url: "", method: "POST" },
});
```

- [ ] **Step 5: Реализовать метаданные telegram**

`packages/api/src/shared/receivers/telegram.ts`:

```ts
import { z } from "zod";
import { defineReceiver } from "./_core";

export const telegramConfigSchema = z.object({
  botToken: z.string().min(1),
  chatId: z.string().min(1),
});

export type TelegramConfig = z.infer<typeof telegramConfigSchema>;

export const telegramReceiver = defineReceiver<TelegramConfig>({
  type: "telegram",
  label: "Telegram",
  icon: "i-solar-plain-2-linear",
  description: "Уведомление в Telegram-чат через бота",
  configSchema: telegramConfigSchema,
  defaultConfig: { botToken: "", chatId: "" },
});
```

- [ ] **Step 6: Реализовать метаданные email**

`packages/api/src/shared/receivers/email.ts`:

```ts
import { z } from "zod";
import { defineReceiver } from "./_core";

export const emailConfigSchema = z.object({
  to: z.string().email(),
  subject: z.string().optional(),
});

export type EmailConfig = z.infer<typeof emailConfigSchema>;

export const emailReceiver = defineReceiver<EmailConfig>({
  type: "email",
  label: "Email",
  icon: "i-solar-letter-linear",
  description: "Письмо на адрес (через платформенный SMTP)",
  configSchema: emailConfigSchema,
  defaultConfig: { to: "" },
});
```

- [ ] **Step 7: Реализовать `index.ts` реестра**

`packages/api/src/shared/receivers/index.ts`:

```ts
import type { ReceiverDefinition } from "./_core";
import { webhookReceiver } from "./webhook";
import { telegramReceiver } from "./telegram";
import { emailReceiver } from "./email";

export { defineReceiver } from "./_core";
export type { ReceiverDefinition, DeliveryContext, DeliveryResult, Deliverer } from "./_core";
export type { WebhookConfig } from "./webhook";
export type { TelegramConfig } from "./telegram";
export type { EmailConfig } from "./email";

export const allReceivers = [
  webhookReceiver,
  telegramReceiver,
  emailReceiver,
] as const satisfies readonly ReceiverDefinition[];

export const receiverDefByType = new Map<string, ReceiverDefinition>(
  allReceivers.map((r) => [r.type, r]),
);

export const receiverTypes = allReceivers.map((r) => r.type);

export interface ReceiverPickerEntry {
  type: string;
  label: string;
  icon: string;
  description: string;
}

export const receiverDefinitions: ReceiverPickerEntry[] = allReceivers.map((r) => ({
  type: r.type,
  label: r.label,
  icon: r.icon,
  description: r.description,
}));

/** Валидирует и нормализует config приёмщика по его типу. Кидает при неизвестном типе/невалидном config. */
export function parseReceiverConfig(type: string, config: unknown): Record<string, unknown> {
  const def = receiverDefByType.get(type);
  if (!def) throw new Error(`Unknown receiver type: ${type}`);
  return def.configSchema.parse(config) as Record<string, unknown>;
}

export function getReceiverDefaultConfig(type: string): Record<string, unknown> {
  const def = receiverDefByType.get(type);
  if (!def) throw new Error(`Unknown receiver type: ${type}`);
  return structuredClone(def.defaultConfig) as Record<string, unknown>;
}
```

- [ ] **Step 8: Запустить тест — убедиться, что проходит**

Run: `pnpm test -- receivers/config`
Expected: PASS (5 тестов).

- [ ] **Step 9: Commit**

```bash
git add packages/api/src/shared/receivers
git commit -m "feat(api): реестр метаданных приёмщиков (defineReceiver + 3 типа) (#69)"
```

---

## Phase 2 — Слой доставки (server-only)

### Task 3: `buildDeliveryContext` — сборка payload из тикета и сайта

**Files:**
- Create: `packages/api/src/services/receivers/payload.ts`
- Test: `packages/api/src/services/receivers/__tests__/payload.test.ts`

- [ ] **Step 1: Падающий тест**

`packages/api/src/services/receivers/__tests__/payload.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildDeliveryContext } from "../payload";

const ticket = {
  id: "t1",
  name: "Иван",
  phone: "+79990000000",
  email: null,
  message: "Хочу 2-комнатную",
  type: "lead",
  source: "modal:callback",
  url: "https://site.ru/p",
  utm: { utm_source: "ya" },
  createdAt: new Date("2026-06-15T10:00:00Z"),
};
const site = { id: "s1", name: "ЖК Пример" };

describe("buildDeliveryContext", () => {
  it("маппит тикет и сайт, сериализует createdAt в ISO", () => {
    const ctx = buildDeliveryContext(ticket as never, site);
    expect(ctx.ticket.id).toBe("t1");
    expect(ctx.ticket.createdAt).toBe("2026-06-15T10:00:00.000Z");
    expect(ctx.site).toEqual({ id: "s1", name: "ЖК Пример" });
    expect(ctx.utm).toEqual({ utm_source: "ya" });
  });

  it("fields содержит только непустые стандартные поля с RU-лейблами", () => {
    const ctx = buildDeliveryContext(ticket as never, site);
    expect(ctx.fields).toEqual([
      { label: "Имя", value: "Иван" },
      { label: "Телефон", value: "+79990000000" },
      { label: "Сообщение", value: "Хочу 2-комнатную" },
    ]);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm test -- receivers/__tests__/payload`
Expected: FAIL (нет модуля `../payload`).

- [ ] **Step 3: Реализовать `payload.ts`**

```ts
import type { tickets } from "@zhk/db/schema";
import type { DeliveryContext } from "../../shared/receivers";

type TicketRow = typeof tickets.$inferSelect;

export function buildDeliveryContext(
  ticket: TicketRow,
  site: { id: string; name: string },
): DeliveryContext {
  const fields: Array<{ label: string; value: string }> = [];
  if (ticket.name) fields.push({ label: "Имя", value: ticket.name });
  fields.push({ label: "Телефон", value: ticket.phone });
  if (ticket.email) fields.push({ label: "Email", value: ticket.email });
  if (ticket.message) fields.push({ label: "Сообщение", value: ticket.message });

  return {
    ticket: {
      id: ticket.id,
      name: ticket.name ?? null,
      phone: ticket.phone,
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

- [ ] **Step 4: Запустить — проходит**

Run: `pnpm test -- receivers/__tests__/payload`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/receivers/payload.ts packages/api/src/services/receivers/__tests__/payload.test.ts
git commit -m "feat(api): buildDeliveryContext — payload приёмщиков из тикета (#69)"
```

---

### Task 4: Webhook deliverer + HMAC-подпись

**Files:**
- Create: `packages/api/src/services/receivers/webhook.ts`
- Test: `packages/api/src/services/receivers/__tests__/webhook.test.ts`

- [ ] **Step 1: Падающий тест**

`packages/api/src/services/receivers/__tests__/webhook.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverWebhook, signBody } from "../webhook";
import type { DeliveryContext } from "../../../shared/receivers";

const ctx = {
  ticket: { id: "t1", name: null, phone: "+7", email: null, message: null, type: "lead", source: null, url: null, createdAt: "2026-06-15T10:00:00.000Z" },
  utm: null,
  site: { id: "s1", name: "ЖК" },
  fields: [{ label: "Телефон", value: "+7" }],
} satisfies DeliveryContext;

afterEach(() => vi.restoreAllMocks());

describe("signBody", () => {
  it("детерминированная HMAC-SHA256 hex с префиксом sha256=", () => {
    const sig = signBody("{}", "secret");
    expect(sig).toBe("sha256=" + signBody("{}", "secret").slice(7));
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
  });
});

describe("deliverWebhook", () => {
  it("шлёт POST JSON, 2xx → ok", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );
    const res = await deliverWebhook(ctx, { url: "https://e.com/h", method: "POST" });
    expect(res).toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init?.headers as Record<string, string>).not.toHaveProperty("X-Signature");
  });

  it("добавляет X-Signature при secret", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 204 }));
    await deliverWebhook(ctx, { url: "https://e.com/h", method: "POST", secret: "s" });
    const [, init] = fetchMock.mock.calls[0]!;
    expect((init?.headers as Record<string, string>)["X-Signature"]).toMatch(/^sha256=/);
  });

  it("не-2xx → error со статусом", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("boom", { status: 500 }));
    const res = await deliverWebhook(ctx, { url: "https://e.com/h", method: "POST" });
    expect(res.ok).toBe(false);
    expect((res as { error: string }).error).toContain("500");
  });

  it("брошенный fetch → error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const res = await deliverWebhook(ctx, { url: "https://e.com/h", method: "POST" });
    expect(res).toEqual({ ok: false, error: "network down" });
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm test -- receivers/__tests__/webhook`
Expected: FAIL (нет `../webhook`).

- [ ] **Step 3: Реализовать `webhook.ts`**

```ts
import { createHmac } from "node:crypto";
import type { Deliverer } from "../../shared/receivers";
import type { WebhookConfig } from "../../shared/receivers";

export function signBody(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

export const deliverWebhook: Deliverer<WebhookConfig> = async (ctx, config) => {
  const body = JSON.stringify(ctx);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(config.headers ?? {}),
  };
  if (config.secret) headers["X-Signature"] = signBody(body, config.secret);

  try {
    const res = await fetch(config.url, {
      method: config.method ?? "POST",
      headers,
      body,
    });
    if (res.status >= 200 && res.status < 300) return { ok: true };
    const text = await res.text().catch(() => "");
    return { ok: false, error: `HTTP ${res.status} ${text}`.trim() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};
```

- [ ] **Step 4: Запустить — проходит**

Run: `pnpm test -- receivers/__tests__/webhook`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/receivers/webhook.ts packages/api/src/services/receivers/__tests__/webhook.test.ts
git commit -m "feat(api): webhook deliverer + HMAC-подпись (#69)"
```

---

### Task 5: Telegram deliverer

**Files:**
- Create: `packages/api/src/services/receivers/telegram.ts`
- Test: `packages/api/src/services/receivers/__tests__/telegram.test.ts`

- [ ] **Step 1: Падающий тест**

`packages/api/src/services/receivers/__tests__/telegram.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverTelegram, formatTelegramMessage } from "../telegram";
import type { DeliveryContext } from "../../../shared/receivers";

const ctx = {
  ticket: { id: "t1", name: "Иван", phone: "+79990000000", email: null, message: "Привет", type: "lead", source: "modal:cb", url: "https://s.ru", createdAt: "2026-06-15T10:00:00.000Z" },
  utm: null,
  site: { id: "s1", name: "ЖК Пример" },
  fields: [
    { label: "Имя", value: "Иван" },
    { label: "Телефон", value: "+79990000000" },
    { label: "Сообщение", value: "Привет" },
  ],
} satisfies DeliveryContext;

afterEach(() => vi.restoreAllMocks());

describe("formatTelegramMessage", () => {
  it("включает имя сайта, лейблы полей и источник", () => {
    const msg = formatTelegramMessage(ctx);
    expect(msg).toContain("ЖК Пример");
    expect(msg).toContain("Имя:");
    expect(msg).toContain("+79990000000");
    expect(msg).toContain("modal:cb");
  });
});

describe("deliverTelegram", () => {
  it("res.ok → ok, бьёт в Bot API с chat_id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const res = await deliverTelegram(ctx, { botToken: "123:abc", chatId: "-100" });
    expect(res).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/bot123:abc/sendMessage");
    expect(JSON.parse(String(init?.body)).chat_id).toBe("-100");
  });

  it("не-ok ответ → error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("bad", { status: 400 }));
    const res = await deliverTelegram(ctx, { botToken: "x", chatId: "y" });
    expect(res.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm test -- receivers/__tests__/telegram`
Expected: FAIL.

- [ ] **Step 3: Реализовать `telegram.ts`**

```ts
import type { Deliverer, DeliveryContext } from "../../shared/receivers";
import type { TelegramConfig } from "../../shared/receivers";

const TYPE_LABELS: Record<string, string> = {
  lead: "Заявка",
  callback: "Обратный звонок",
  question: "Вопрос",
  booking: "Бронирование",
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatTelegramMessage(ctx: DeliveryContext): string {
  const lines = [
    `📩 <b>${TYPE_LABELS[ctx.ticket.type] ?? ctx.ticket.type}</b> — ${escapeHtml(ctx.site.name)}`,
    "",
  ];
  for (const f of ctx.fields) {
    lines.push(`${escapeHtml(f.label)}: <b>${escapeHtml(f.value)}</b>`);
  }
  if (ctx.ticket.source) lines.push(`📍 Источник: ${escapeHtml(ctx.ticket.source)}`);
  if (ctx.ticket.url) lines.push(`🔗 ${escapeHtml(ctx.ticket.url)}`);
  return lines.join("\n");
}

export const deliverTelegram: Deliverer<TelegramConfig> = async (ctx, config) => {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: formatTelegramMessage(ctx),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `${res.status} ${text}`.trim() };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};
```

- [ ] **Step 4: Запустить — проходит**

Run: `pnpm test -- receivers/__tests__/telegram`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/receivers/telegram.ts packages/api/src/services/receivers/__tests__/telegram.test.ts
git commit -m "feat(api): telegram deliverer (#69)"
```

---

### Task 6: SMTP-обёртка + Email deliverer + env SMTP_*

**Files:**
- Modify: `packages/env/src/server.ts:34-42`
- Modify: `packages/api/package.json` (зависимость nodemailer)
- Create: `packages/api/src/services/receivers/smtp.ts`
- Create: `packages/api/src/services/receivers/email.ts`
- Test: `packages/api/src/services/receivers/__tests__/email.test.ts`

- [ ] **Step 1: Добавить SMTP-переменные в env**

В `packages/env/src/server.ts`, в объект `server`, перед `S3_ACCESS_KEY_ID` добавить:

```ts
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    SMTP_SECURE: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
```

- [ ] **Step 2: Установить nodemailer**

Run: `pnpm --filter @zhk/api add nodemailer && pnpm --filter @zhk/api add -D @types/nodemailer`
Expected: пакеты добавлены в `packages/api/package.json`.

- [ ] **Step 3: Падающий тест (с моком smtp)**

`packages/api/src/services/receivers/__tests__/email.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeliveryContext } from "../../../shared/receivers";

const ctx = {
  ticket: { id: "t1", name: "Иван", phone: "+7", email: null, message: "Привет", type: "lead", source: null, url: null, createdAt: "2026-06-15T10:00:00.000Z" },
  utm: null,
  site: { id: "s1", name: "ЖК Пример" },
  fields: [{ label: "Имя", value: "Иван" }, { label: "Телефон", value: "+7" }],
} satisfies DeliveryContext;

afterEach(() => vi.restoreAllMocks());

describe("deliverEmail", () => {
  it("no-op error без сконфигуренного SMTP", async () => {
    vi.doMock("../smtp", () => ({ getMailer: () => null }));
    const { deliverEmail } = await import("../email");
    const res = await deliverEmail(ctx, { to: "sales@a.ru" });
    expect(res.ok).toBe(false);
    expect((res as { error: string }).error).toMatch(/SMTP/i);
    vi.doUnmock("../smtp");
  });

  it("шлёт письмо через mailer → ok", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "1" });
    vi.doMock("../smtp", () => ({ getMailer: () => ({ sendMail }), getFrom: () => "noreply@a.ru" }));
    const { deliverEmail } = await import("../email");
    const res = await deliverEmail(ctx, { to: "sales@a.ru", subject: "Тема" });
    expect(res).toEqual({ ok: true });
    expect(sendMail).toHaveBeenCalledOnce();
    const arg = sendMail.mock.calls[0]![0];
    expect(arg.to).toBe("sales@a.ru");
    expect(arg.subject).toBe("Тема");
    expect(arg.from).toBe("noreply@a.ru");
    expect(arg.text).toContain("Иван");
    vi.doUnmock("../smtp");
  });
});
```

> Примечание: `vi.doMock` + динамический `await import` — обязательны, потому что `email.ts` импортирует `./smtp` статически; обычный `vi.mock` с hoisting тоже сработает, но doMock+dynamic import надёжнее для пер-тестового мока.

- [ ] **Step 4: Запустить — падает**

Run: `pnpm test -- receivers/__tests__/email`
Expected: FAIL (нет `../email`/`../smtp`).

- [ ] **Step 5: Реализовать `smtp.ts`**

```ts
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@zhk/env/server";

let cached: Transporter | null | undefined;

/** Возвращает singleton-транспорт или null, если SMTP не сконфигурен. */
export function getMailer(): Transporter | null {
  if (cached !== undefined) return cached;
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    cached = null;
    return cached;
  }
  cached = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return cached;
}

export function getFrom(): string {
  return env.SMTP_FROM || env.SMTP_USER || "no-reply@localhost";
}
```

- [ ] **Step 6: Реализовать `email.ts`**

```ts
import type { Deliverer, DeliveryContext } from "../../shared/receivers";
import type { EmailConfig } from "../../shared/receivers";
import { getMailer, getFrom } from "./smtp";

const TYPE_LABELS: Record<string, string> = {
  lead: "Заявка",
  callback: "Обратный звонок",
  question: "Вопрос",
  booking: "Бронирование",
};

function renderText(ctx: DeliveryContext): string {
  const lines = [
    `${TYPE_LABELS[ctx.ticket.type] ?? ctx.ticket.type} — ${ctx.site.name}`,
    "",
    ...ctx.fields.map((f) => `${f.label}: ${f.value}`),
  ];
  if (ctx.ticket.source) lines.push(`Источник: ${ctx.ticket.source}`);
  if (ctx.ticket.url) lines.push(`Страница: ${ctx.ticket.url}`);
  return lines.join("\n");
}

function renderHtml(ctx: DeliveryContext): string {
  const rows = ctx.fields
    .map((f) => `<tr><td style="padding:4px 8px;color:#666">${f.label}</td><td style="padding:4px 8px"><b>${f.value}</b></td></tr>`)
    .join("");
  return `<h2>${TYPE_LABELS[ctx.ticket.type] ?? ctx.ticket.type} — ${ctx.site.name}</h2><table>${rows}</table>` +
    (ctx.ticket.source ? `<p>Источник: ${ctx.ticket.source}</p>` : "") +
    (ctx.ticket.url ? `<p>Страница: <a href="${ctx.ticket.url}">${ctx.ticket.url}</a></p>` : "");
}

export const deliverEmail: Deliverer<EmailConfig> = async (ctx, config) => {
  const mailer = getMailer();
  if (!mailer) return { ok: false, error: "SMTP не настроен (нет SMTP_HOST/SMTP_PORT)" };
  try {
    await mailer.sendMail({
      from: getFrom(),
      to: config.to,
      subject: config.subject || `${TYPE_LABELS[ctx.ticket.type] ?? "Заявка"} — ${ctx.site.name}`,
      text: renderText(ctx),
      html: renderHtml(ctx),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};
```

- [ ] **Step 7: Запустить — проходит**

Run: `pnpm test -- receivers/__tests__/email`
Expected: PASS (2 теста).

- [ ] **Step 8: Commit**

```bash
git add packages/env/src/server.ts packages/api/package.json packages/api/src/services/receivers/smtp.ts packages/api/src/services/receivers/email.ts packages/api/src/services/receivers/__tests__/email.test.ts pnpm-lock.yaml
git commit -m "feat(api): email deliverer + SMTP-транспорт + env SMTP_* (#69)"
```

---

### Task 7: Реестр deliverers + consistency-тест

**Files:**
- Create: `packages/api/src/services/receivers/index.ts`
- Test: `packages/api/src/services/receivers/__tests__/deliverers.test.ts`

- [ ] **Step 1: Падающий тест на consistency**

`packages/api/src/services/receivers/__tests__/deliverers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deliverers } from "../index";
import { receiverTypes } from "../../../shared/receivers";

describe("deliverers registry", () => {
  it("каждому типу метаданных соответствует deliverer и наоборот", () => {
    expect(new Set(Object.keys(deliverers))).toEqual(new Set(receiverTypes));
  });

  it("все deliverers — функции", () => {
    for (const fn of Object.values(deliverers)) {
      expect(typeof fn).toBe("function");
    }
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm test -- receivers/__tests__/deliverers`
Expected: FAIL (нет `../index`).

- [ ] **Step 3: Реализовать `index.ts`**

```ts
import type { Deliverer } from "../../shared/receivers";
import { deliverWebhook } from "./webhook";
import { deliverTelegram } from "./telegram";
import { deliverEmail } from "./email";

export const deliverers: Record<string, Deliverer> = {
  webhook: deliverWebhook as Deliverer,
  telegram: deliverTelegram as Deliverer,
  email: deliverEmail as Deliverer,
};

export { buildDeliveryContext } from "./payload";
export { resolveReceiverIds } from "./resolve";
export { processTicketDeliveries, createPendingDeliveries } from "./dispatch";
```

> Примечание: `resolve` и `dispatch` ещё не созданы (Task 8, 9). Если исполнитель идёт строго по порядку — временно закомментировать их ре-экспорт и раскомментировать в Task 9. Либо реализовать Task 8/9 до запуска check-types.

- [ ] **Step 4: Запустить — проходит**

Run: `pnpm test -- receivers/__tests__/deliverers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/receivers/index.ts packages/api/src/services/receivers/__tests__/deliverers.test.ts
git commit -m "feat(api): реестр deliverers + consistency-тест (#69)"
```

---

### Task 8: `resolveReceiverIds` — резолв приёмщиков формы

**Files:**
- Create: `packages/api/src/services/receivers/resolve.ts`
- Test: `packages/api/src/services/receivers/__tests__/resolve.test.ts`

- [ ] **Step 1: Падающий тест**

`packages/api/src/services/receivers/__tests__/resolve.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveReceiverIds } from "../resolve";

const enabled = [{ id: "r1" }, { id: "r2" }, { id: "r3" }];

describe("resolveReceiverIds", () => {
  it("форма найдена → пересечение её receiverIds с enabled", () => {
    expect(resolveReceiverIds({ receiverIds: ["r2", "r3", "rX"] }, enabled)).toEqual(["r2", "r3"]);
  });

  it("форма найдена, но receiverIds пуст → пусто (явный выбор «никто»)", () => {
    expect(resolveReceiverIds({ receiverIds: [] }, enabled)).toEqual([]);
  });

  it("форма не найдена (null) → все enabled (бэк-компат)", () => {
    expect(resolveReceiverIds(null, enabled)).toEqual(["r1", "r2", "r3"]);
  });
});
```

- [ ] **Step 2: Запустить — падает**

Run: `pnpm test -- receivers/__tests__/resolve`
Expected: FAIL.

- [ ] **Step 3: Реализовать `resolve.ts`**

```ts
/**
 * Какие приёмщики срабатывают для submission.
 * - форма найдена → её receiverIds ∩ enabled (порядок enabled);
 * - форма не найдена (программная заявка) → все enabled (бэк-компат с «Telegram на всё»).
 */
export function resolveReceiverIds(
  form: { receiverIds: string[] } | null,
  enabledReceivers: Array<{ id: string }>,
): string[] {
  const enabledIds = enabledReceivers.map((r) => r.id);
  if (!form) return enabledIds;
  const set = new Set(form.receiverIds);
  return enabledIds.filter((id) => set.has(id));
}
```

- [ ] **Step 4: Запустить — проходит**

Run: `pnpm test -- receivers/__tests__/resolve`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/receivers/resolve.ts packages/api/src/services/receivers/__tests__/resolve.test.ts
git commit -m "feat(api): resolveReceiverIds — резолв приёмщиков формы (#69)"
```

---

### Task 9: Диспетчер доставки (`createPendingDeliveries`, `processTicketDeliveries`)

**Files:**
- Create: `packages/api/src/services/receivers/dispatch.ts`

> Этот слой пишет в БД (интеграция), поэтому без unit-теста — проверяется в Phase 6 (E2E через preview/прямой прогон). Раскомментировать ре-экспорты в `index.ts` (Task 7 Step 3), если были закомментированы.

- [ ] **Step 1: Реализовать `dispatch.ts`**

```ts
import { db } from "@zhk/db";
import { formDeliveries, formReceivers, tickets } from "@zhk/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { receiverDefByType } from "../../shared/receivers";
import { deliverers } from "./index";
import { buildDeliveryContext } from "./payload";

/** Создаёт pending-строки доставки на каждый приёмщик. Возвращает их id. */
export async function createPendingDeliveries(
  ticketId: string,
  receivers: Array<{ id: string; type: string; name: string }>,
): Promise<string[]> {
  if (receivers.length === 0) return [];
  const rows = await db
    .insert(formDeliveries)
    .values(
      receivers.map((r) => ({
        ticketId,
        receiverId: r.id,
        receiverType: r.type,
        receiverName: r.name,
        status: "pending" as const,
      })),
    )
    .returning({ id: formDeliveries.id });
  return rows.map((r) => r.id);
}

/**
 * Прогоняет доставку: берёт строки в статусах pending/error (или указанные deliveryIds),
 * вызывает deliverer по типу приёмщика, обновляет статус. Идемпотентно и переиспользуется ретраем.
 */
export async function processTicketDeliveries(
  ticketId: string,
  deliveryIds?: string[],
): Promise<void> {
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, ticketId) });
  if (!ticket) return;

  const site = await db.query.sites.findFirst({
    where: (s, { eq: e }) => e(s.id, ticket.siteId),
    columns: { id: true, name: true },
  });
  const ctx = buildDeliveryContext(ticket, {
    id: ticket.siteId,
    name: site?.name ?? "",
  });

  const rows = await db.query.formDeliveries.findMany({
    where: deliveryIds
      ? and(eq(formDeliveries.ticketId, ticketId), inArray(formDeliveries.id, deliveryIds))
      : and(
          eq(formDeliveries.ticketId, ticketId),
          inArray(formDeliveries.status, ["pending", "error"]),
        ),
  });

  await Promise.allSettled(
    rows.map(async (row) => {
      const receiver = row.receiverId
        ? await db.query.formReceivers.findFirst({ where: eq(formReceivers.id, row.receiverId) })
        : null;
      const deliverer = deliverers[row.receiverType];
      let result: { ok: boolean; error?: string };
      if (!receiver || !receiver.enabled) {
        result = { ok: false, error: "Приёмщик удалён или выключен" };
      } else if (!deliverer) {
        result = { ok: false, error: `Нет обработчика для типа ${row.receiverType}` };
      } else {
        const def = receiverDefByType.get(row.receiverType);
        const config = def ? def.configSchema.parse(receiver.config) : receiver.config;
        result = await deliverer(ctx, config);
      }
      await db
        .update(formDeliveries)
        .set({
          status: result.ok ? "ok" : "error",
          error: result.ok ? null : (result.error ?? "Неизвестная ошибка"),
          attempts: row.attempts + 1,
          lastAttemptAt: new Date(),
        })
        .where(eq(formDeliveries.id, row.id));
    }),
  );
}
```

- [ ] **Step 2: Проверка типов**

Run: `pnpm --filter @zhk/api check-types`
Expected: без ошибок (если ругается на ре-экспорты resolve/dispatch в index.ts — раскомментировать их).

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/services/receivers/dispatch.ts packages/api/src/services/receivers/index.ts
git commit -m "feat(api): диспетчер доставки приёмщиков (pending + process) (#69)"
```

---

## Phase 3 — API-процедуры

### Task 10: Роутер `formReceivers` (CRUD + reorder + test)

**Files:**
- Create: `packages/api/src/routers/form-receivers.ts`
- Modify: `packages/api/src/routers/index.ts:33-76`

- [ ] **Step 1: Реализовать роутер**

`packages/api/src/routers/form-receivers.ts`:

```ts
import { z } from "zod";
import { db } from "@zhk/db";
import { formReceivers } from "@zhk/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { siteProcedure } from "../index";
import { parseReceiverConfig, receiverTypes } from "../shared/receivers";
import { deliverers, buildDeliveryContext } from "../services/receivers";

const typeSchema = z.enum(receiverTypes as [string, ...string[]]);

export const formReceiversRouter = {
  list: siteProcedure.handler(async ({ context }) => {
    return db.query.formReceivers.findMany({
      where: eq(formReceivers.siteId, context.siteId),
      orderBy: [asc(formReceivers.sortOrder), asc(formReceivers.createdAt)],
    });
  }),

  create: siteProcedure
    .input(
      z.object({
        type: typeSchema,
        name: z.string().min(1),
        config: z.record(z.string(), z.unknown()),
        enabled: z.boolean().default(true),
      }),
    )
    .handler(async ({ input, context }) => {
      let config: Record<string, unknown>;
      try {
        config = parseReceiverConfig(input.type, input.config);
      } catch {
        throw new ORPCError("BAD_REQUEST", { message: "Некорректная конфигурация приёмщика" });
      }
      const [created] = await db
        .insert(formReceivers)
        .values({ siteId: context.siteId, type: input.type, name: input.name, config, enabled: input.enabled })
        .returning();
      return created;
    }),

  update: siteProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        config: z.record(z.string(), z.unknown()).optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const existing = await db.query.formReceivers.findFirst({
        where: and(eq(formReceivers.id, input.id), eq(formReceivers.siteId, context.siteId)),
      });
      if (!existing) throw new ORPCError("NOT_FOUND", { message: "Приёмщик не найден" });

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.enabled !== undefined) updates.enabled = input.enabled;
      if (input.config !== undefined) {
        try {
          updates.config = parseReceiverConfig(existing.type, input.config);
        } catch {
          throw new ORPCError("BAD_REQUEST", { message: "Некорректная конфигурация приёмщика" });
        }
      }
      const [updated] = await db
        .update(formReceivers)
        .set(updates)
        .where(and(eq(formReceivers.id, input.id), eq(formReceivers.siteId, context.siteId)))
        .returning();
      return updated;
    }),

  delete: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const deleted = await db
        .delete(formReceivers)
        .where(and(eq(formReceivers.id, input.id), eq(formReceivers.siteId, context.siteId)))
        .returning({ id: formReceivers.id });
      if (!deleted.length) throw new ORPCError("NOT_FOUND", { message: "Приёмщик не найден" });
      return { success: true };
    }),

  reorder: siteProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .handler(async ({ input, context }) => {
      await db.transaction(async (tx) => {
        for (let i = 0; i < input.ids.length; i++) {
          await tx
            .update(formReceivers)
            .set({ sortOrder: i })
            .where(and(eq(formReceivers.id, input.ids[i]!), eq(formReceivers.siteId, context.siteId)));
        }
      });
      return { success: true };
    }),

  test: siteProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const receiver = await db.query.formReceivers.findFirst({
        where: and(eq(formReceivers.id, input.id), eq(formReceivers.siteId, context.siteId)),
      });
      if (!receiver) throw new ORPCError("NOT_FOUND", { message: "Приёмщик не найден" });
      const deliverer = deliverers[receiver.type];
      if (!deliverer) throw new ORPCError("BAD_REQUEST", { message: "Нет обработчика для типа" });

      const config = parseReceiverConfig(receiver.type, receiver.config);
      const ctx = buildDeliveryContext(
        {
          id: "test",
          name: "Тест",
          phone: "+7 000 000-00-00",
          email: "test@example.com",
          message: "Это тестовая заявка из админки.",
          type: "lead",
          source: "test",
          url: null,
          utm: null,
          createdAt: new Date(),
        } as never,
        { id: context.siteId, name: context.site?.name ?? "" },
      );
      const result = await deliverer(ctx, config);
      return result;
    }),
};
```

> Замечание: `siteProcedure` не несёт `context.site`, только `context.siteId`. В `test` имя сайта берём из `context.site?.name`, если оно есть; иначе пустая строка — для теста допустимо. (При желании можно догрузить site из БД, но это не обязательно для теста.)

- [ ] **Step 2: Зарегистрировать роутер в appRouter**

В `packages/api/src/routers/index.ts`: добавить импорт после строки 33 (`import { modalsRouter }...`):

```ts
import { formReceiversRouter } from "./form-receivers";
```

В объект `appRouter` добавить (рядом с `tickets`):

```ts
  formReceivers: formReceiversRouter,
```

- [ ] **Step 3: Проверка типов**

Run: `pnpm --filter @zhk/api check-types`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/form-receivers.ts packages/api/src/routers/index.ts
git commit -m "feat(api): роутер formReceivers (CRUD + reorder + test) (#69)"
```

---

### Task 11: Переписать `public.tickets.create` (резолв + pending + фоновая доставка)

**Files:**
- Modify: `packages/api/src/routers/public/tickets.ts` (полная замена)

- [ ] **Step 1: Полностью заменить файл**

`packages/api/src/routers/public/tickets.ts`:

```ts
import { z } from "zod";
import { db } from "@zhk/db";
import { tickets, ticketTypeEnum, modals, formReceivers } from "@zhk/db/schema";
import { and, eq } from "drizzle-orm";
import { publicActiveSiteProcedure } from "../../index";
import { rateLimit } from "../../middleware/rate-limit";
import { resolveReceiverIds, createPendingDeliveries, processTicketDeliveries } from "../../services/receivers";

/** Извлекает slug модалки из source вида "modal:{slug}". */
function modalSlugFromSource(source: string | undefined): string | null {
  if (!source) return null;
  const m = /^modal:(.+)$/.exec(source);
  return m ? m[1]! : null;
}

export const publicTicketsRouter = {
  create: publicActiveSiteProcedure
    .use(rateLimit("ticketCreate", { keyBy: "ip+site" }))
    .use(rateLimit("ticketCreateHourly", { keyBy: "ip+site" }))
    .use(rateLimit("ticketCreate", {
      keyBy: "ip+extra",
      extractExtra: (input) => (input as { phone?: string })?.phone,
    }))
    .input(
      z.object({
        name: z.string().optional(),
        phone: z.string().min(1),
        email: z.union([z.string().email(), z.literal("")]).optional(),
        message: z.string().optional(),
        type: z.enum(ticketTypeEnum.enumValues).default("lead"),
        source: z.string().optional(),
        url: z.string().optional(),
        utm: z.record(z.string(), z.string()).optional(),
        apartmentId: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const siteId = context.siteId;

      const created = await db
        .insert(tickets)
        .values({
          siteId,
          name: input.name ?? null,
          phone: input.phone,
          email: input.email || null,
          message: input.message ?? null,
          type: input.type,
          source: input.source ?? null,
          url: input.url ?? null,
          utm: input.utm ?? null,
          apartmentId: input.apartmentId ?? null,
        })
        .returning()
        .then((r) => r[0]!);

      // Резолв приёмщиков: форма (модалка по slug) → её receiverIds, иначе все enabled.
      const enabled = await db.query.formReceivers.findMany({
        where: and(eq(formReceivers.siteId, siteId), eq(formReceivers.enabled, true)),
        orderBy: (r, { asc }) => [asc(r.sortOrder), asc(r.createdAt)],
      });

      const slug = modalSlugFromSource(input.source);
      const form = slug
        ? await db.query.modals.findFirst({
            where: and(eq(modals.siteId, siteId), eq(modals.slug, slug)),
            columns: { receiverIds: true },
          })
        : null;

      const targetIds = resolveReceiverIds(form ?? null, enabled);
      const targets = enabled.filter((r) => targetIds.includes(r.id));

      if (targets.length > 0) {
        const deliveryIds = await createPendingDeliveries(
          created.id,
          targets.map((r) => ({ id: r.id, type: r.type, name: r.name })),
        );
        // Фоновая доставка — не блокирует ответ. pending-строки уже в БД (durable).
        void processTicketDeliveries(created.id, deliveryIds);
      }

      return { success: true, id: created.id };
    }),
};
```

> Изменения против старого файла: удалён inline `sendTelegramNotification`; на тикете теперь проставляется `siteId` (раньше падал в default); добавлены резолв приёмщиков, pending-строки и фоновая доставка.

- [ ] **Step 2: Проверка типов**

Run: `pnpm --filter @zhk/api check-types`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routers/public/tickets.ts
git commit -m "feat(api): tickets.create — резолв приёмщиков + лог доставки + фоновая отправка (#69)"
```

---

### Task 12: `tickets.getById` с доставками + `tickets.retryDelivery`

**Files:**
- Modify: `packages/api/src/routers/tickets.ts:38-49` (getById) и добавить процедуру

- [ ] **Step 1: Дополнить getById доставками и добавить retryDelivery**

В `packages/api/src/routers/tickets.ts`:
- В импорты добавить:

```ts
import { formDeliveries } from "@zhk/db/schema";
import { processTicketDeliveries } from "../services/receivers";
```

- Заменить `getById` (строки 38-49) на:

```ts
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const item = await db.query.tickets.findFirst({
        where: eq(tickets.id, input.id),
        with: {
          apartment: { columns: { id: true } },
          deliveries: { orderBy: (d, { asc }) => [asc(d.createdAt)] },
        },
      });
      if (!item) {
        throw new ORPCError("NOT_FOUND", { message: "Ticket not found" });
      }
      return item;
    }),
```

- Перед закрывающей `};` роутера добавить:

```ts
  retryDelivery: protectedProcedure
    .input(z.object({ ticketId: z.string(), deliveryId: z.string().optional() }))
    .handler(async ({ input }) => {
      await processTicketDeliveries(
        input.ticketId,
        input.deliveryId ? [input.deliveryId] : undefined,
      );
      const deliveries = await db.query.formDeliveries.findMany({
        where: eq(formDeliveries.ticketId, input.ticketId),
        orderBy: (d, { asc }) => [asc(d.createdAt)],
      });
      return { deliveries };
    }),
```

- [ ] **Step 2: Добавить relation `deliveries` в схему тикетов**

Нужно, чтобы `with: { deliveries }` работал. В `packages/db/src/schema/tickets.ts` найти `ticketsRelations` (relations) и добавить `many(formDeliveries)`. Если relations импортируют из других файлов — добавить импорт `formDeliveries`. Конкретно, в блок relations тикета добавить:

```ts
  deliveries: many(formDeliveries),
```

и импорт вверху файла:

```ts
import { formDeliveries } from "./form-deliveries";
```

(Если в `tickets.ts` ещё нет `many` в сигнатуре relations — изменить `relations(tickets, ({ one }) => ...)` на `relations(tickets, ({ one, many }) => ...)`.)

> ВНИМАНИЕ на циклический импорт: `form-deliveries.ts` импортирует `tickets`, а теперь `tickets.ts` импортирует `formDeliveries`. Drizzle это переносит (relations ленивы), но если возникнет рантайм-проблема инициализации — определить relation тикетов в `form-deliveries.ts` через `relations(tickets, ...)` там же. Сначала пробуем простой путь.

- [ ] **Step 3: Проверка типов**

Run: `pnpm --filter @zhk/api check-types && pnpm --filter @zhk/db check-types`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/tickets.ts packages/db/src/schema/tickets.ts
git commit -m "feat(api): tickets.getById с доставками + retryDelivery (#69)"
```

---

### Task 13: `modals` create/update принимают `receiverIds`

**Files:**
- Modify: `packages/api/src/routers/modals.ts:53-123`

- [ ] **Step 1: Добавить `receiverIds` в create input + values**

В `create` (input-объект, после `fields: modalFieldsSchema.optional(),`):

```ts
        receiverIds: z.array(z.string()).optional(),
```

В `.values({...})` добавить:

```ts
          receiverIds: input.receiverIds ?? [],
```

- [ ] **Step 2: Добавить `receiverIds` в update input**

В `update` (input-объект, после `fields: modalFieldsSchema.optional(),`):

```ts
        receiverIds: z.array(z.string()).optional(),
```

(Обработка update — общий цикл по `fields`, `receiverIds` подхватится автоматически как ключ.)

- [ ] **Step 3: Проверка типов**

Run: `pnpm --filter @zhk/api check-types`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/modals.ts
git commit -m "feat(api): modals create/update принимают receiverIds (#69)"
```

- [ ] **Step 5: Прогнать весь backend-набор тестов**

Run: `pnpm test`
Expected: все тесты зелёные (существующие + новые receivers).

---

## Phase 4 — Admin UI

> Vue SFC в этом репо НЕ покрываются unit-тестами (`check-types` не валидирует SFC). Поэтому UI-таски — «реализация + проверка через preview» (Phase 6). Используем только `@nuxt/ui`, иконки `i-solar-*-linear`, паттерн vue-query + `$orpc`/`$orpcClient`.

### Task 14: Утилиты + config-редакторы приёмщиков + их реестр

**Files:**
- Create: `apps/admin/app/utils/receivers.ts`
- Create: `apps/admin/app/components/receivers/WebhookReceiverConfig.vue`
- Create: `apps/admin/app/components/receivers/TelegramReceiverConfig.vue`
- Create: `apps/admin/app/components/receivers/EmailReceiverConfig.vue`
- Create: `apps/admin/app/components/receivers/configRegistry.ts`

- [ ] **Step 1: Утилиты лейблов/иконок**

`apps/admin/app/utils/receivers.ts`:

```ts
import { receiverDefinitions } from "@zhk/api/shared/receivers";

export const receiverTypeLabels: Record<string, string> = Object.fromEntries(
  receiverDefinitions.map((r) => [r.type, r.label]),
);
export const receiverTypeIcons: Record<string, string> = Object.fromEntries(
  receiverDefinitions.map((r) => [r.type, r.icon]),
);

export const deliveryStatusLabels: Record<string, string> = {
  pending: "В очереди",
  ok: "Доставлено",
  error: "Ошибка",
};
export const deliveryStatusColors: Record<string, "neutral" | "success" | "error"> = {
  pending: "neutral",
  ok: "success",
  error: "error",
};
```

- [ ] **Step 2: Webhook config-редактор**

`apps/admin/app/components/receivers/WebhookReceiverConfig.vue`:

```vue
<script setup lang="ts">
const config = defineModel<Record<string, any>>({ required: true });
function set<K extends string>(key: K, value: unknown) {
  config.value = { ...config.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="URL" required description="Куда слать POST с JSON заявки">
      <UInput :model-value="config.url" placeholder="https://example.com/webhook" class="w-full" @update:model-value="set('url', $event)" />
    </UFormField>
    <UFormField label="Метод">
      <USelect :model-value="config.method ?? 'POST'" :items="['POST', 'PUT']" @update:model-value="set('method', $event)" />
    </UFormField>
    <UFormField label="Секрет подписи" description="Если задан — шлём заголовок X-Signature (HMAC-SHA256 тела)">
      <UInput :model-value="config.secret" type="password" placeholder="необязательно" class="w-full" @update:model-value="set('secret', $event)" />
    </UFormField>
  </div>
</template>
```

- [ ] **Step 3: Telegram config-редактор**

`apps/admin/app/components/receivers/TelegramReceiverConfig.vue`:

```vue
<script setup lang="ts">
const config = defineModel<Record<string, any>>({ required: true });
function set<K extends string>(key: K, value: unknown) {
  config.value = { ...config.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Bot Token" required description="Токен бота из @BotFather">
      <UInput :model-value="config.botToken" placeholder="123456:ABC-DEF..." icon="i-solar-key-linear" class="w-full" @update:model-value="set('botToken', $event)" />
    </UFormField>
    <UFormField label="Chat ID" required description="ID чата/группы. Узнать: напишите боту, откройте https://api.telegram.org/bot{TOKEN}/getUpdates">
      <UInput :model-value="config.chatId" placeholder="-1001234567890" icon="i-solar-chat-square-linear" class="w-full" @update:model-value="set('chatId', $event)" />
    </UFormField>
  </div>
</template>
```

- [ ] **Step 4: Email config-редактор**

`apps/admin/app/components/receivers/EmailReceiverConfig.vue`:

```vue
<script setup lang="ts">
const config = defineModel<Record<string, any>>({ required: true });
function set<K extends string>(key: K, value: unknown) {
  config.value = { ...config.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Кому (email)" required description="Адрес получателя заявок">
      <UInput :model-value="config.to" type="email" placeholder="sales@example.ru" icon="i-solar-letter-linear" class="w-full" @update:model-value="set('to', $event)" />
    </UFormField>
    <UFormField label="Тема письма" description="Необязательно — по умолчанию подставится тип заявки и сайт">
      <UInput :model-value="config.subject" placeholder="Новая заявка с сайта" class="w-full" @update:model-value="set('subject', $event)" />
    </UFormField>
  </div>
</template>
```

- [ ] **Step 5: Реестр config-редакторов (авторегистрация)**

`apps/admin/app/components/receivers/configRegistry.ts`:

```ts
import type { Component } from "vue";
import { receiverTypes } from "@zhk/api/shared/receivers";

const modules = import.meta.glob<{ default: Component }>("./*ReceiverConfig.vue", { eager: true });

function fileNameToType(path: string): string {
  const base = path.split("/").pop()!.replace(/ReceiverConfig\.vue$/, "");
  return base.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const validTypes = new Set<string>(receiverTypes);

export const receiverConfigComponents: Record<string, Component> = Object.fromEntries(
  Object.entries(modules)
    .map(([path, mod]) => [fileNameToType(path), mod.default] as const)
    .filter(([type]) => validTypes.has(type)),
);
```

- [ ] **Step 6: Commit**

```bash
git add apps/admin/app/utils/receivers.ts apps/admin/app/components/receivers
git commit -m "feat(admin): config-редакторы приёмщиков + реестр (#69)"
```

---

### Task 15: Страница «Приёмщики» (`/tickets/receivers`)

**Files:**
- Create: `apps/admin/app/pages/tickets/receivers.vue`

- [ ] **Step 1: Реализовать страницу**

`apps/admin/app/pages/tickets/receivers.vue`:

```vue
<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { receiverDefinitions, getReceiverDefaultConfig } from "@zhk/api/shared/receivers";
import { receiverConfigComponents } from "~/components/receivers/configRegistry";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data: receivers, isPending } = useQuery($orpc.formReceivers.list.queryOptions());

const open = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ type: "webhook", name: "", config: {} as Record<string, any>, enabled: true });

function startCreate(type: string) {
  editingId.value = null;
  form.type = type;
  form.name = receiverDefinitions.find((r) => r.type === type)?.label ?? type;
  form.config = getReceiverDefaultConfig(type);
  form.enabled = true;
  open.value = true;
}
function startEdit(r: any) {
  editingId.value = r.id;
  form.type = r.type;
  form.name = r.name;
  form.config = { ...r.config };
  form.enabled = r.enabled;
  open.value = true;
}

const saveMutation = useMutation({
  mutationFn: () =>
    editingId.value
      ? $orpcClient.formReceivers.update({ id: editingId.value, name: form.name, config: form.config, enabled: form.enabled })
      : $orpcClient.formReceivers.create({ type: form.type as any, name: form.name, config: form.config, enabled: form.enabled }),
  onSuccess: () => {
    toast.add({ title: "Сохранено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.formReceivers.key() });
    open.value = false;
  },
  onError: (e: any) => toast.add({ title: e?.message ?? "Ошибка сохранения", color: "error" }),
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.formReceivers.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Приёмщик удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.formReceivers.key() });
  },
});

const toggleMutation = useMutation({
  mutationFn: (r: any) => $orpcClient.formReceivers.update({ id: r.id, enabled: !r.enabled }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: $orpc.formReceivers.key() }),
});

const testingId = ref<string | null>(null);
async function testReceiver(id: string) {
  testingId.value = id;
  try {
    const res = await $orpcClient.formReceivers.test({ id });
    if (res.ok) toast.add({ title: "Тест отправлен успешно", color: "success" });
    else toast.add({ title: "Тест не прошёл", description: (res as any).error, color: "error" });
  } catch (e: any) {
    toast.add({ title: e?.message ?? "Ошибка теста", color: "error" });
  } finally {
    testingId.value = null;
  }
}

const configComponent = computed(() => receiverConfigComponents[form.type]);
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/tickets">
          <UButton variant="ghost" icon="i-solar-arrow-left-linear" size="sm" />
        </NuxtLink>
        <div>
          <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">Приёмщики</h1>
          <p class="text-(--ui-text-muted) text-sm mt-1">Куда отправлять данные форм</p>
        </div>
      </div>
      <UDropdownMenu
        :items="receiverDefinitions.map((r) => ({ label: r.label, icon: r.icon, onSelect: () => startCreate(r.type) }))"
      >
        <UButton icon="i-solar-add-circle-linear">Добавить приёмщик</UButton>
      </UDropdownMenu>
    </div>

    <div v-if="isPending" class="flex justify-center py-20">
      <UIcon name="i-solar-refresh-linear" class="animate-spin text-3xl" />
    </div>

    <AppEmptyState
      v-else-if="!receivers?.length"
      icon="i-solar-inbox-linear"
      title="Приёмщиков пока нет"
      description="Добавьте webhook, Telegram или email, чтобы получать заявки."
    />

    <div v-else class="space-y-2 max-w-3xl">
      <div
        v-for="r in receivers"
        :key="r.id"
        class="flex items-center gap-3 border border-(--ui-border) rounded-lg p-4"
      >
        <UIcon :name="receiverTypeIcons[r.type]" class="text-xl text-(--ui-text-muted)" />
        <div class="flex-1 min-w-0">
          <div class="font-medium text-(--ui-text-highlighted) truncate">{{ r.name }}</div>
          <div class="text-xs text-(--ui-text-dimmed)">{{ receiverTypeLabels[r.type] }}</div>
        </div>
        <USwitch :model-value="r.enabled" @update:model-value="toggleMutation.mutate(r)" />
        <UButton variant="ghost" size="xs" icon="i-solar-test-tube-linear" :loading="testingId === r.id" @click="testReceiver(r.id)">Проверить</UButton>
        <UButton variant="ghost" size="xs" icon="i-solar-pen-linear" @click="startEdit(r)" />
        <UButton variant="ghost" size="xs" color="error" icon="i-solar-trash-bin-trash-linear" @click="deleteMutation.mutate(r.id)" />
      </div>
    </div>

    <UModal v-model:open="open" :title="editingId ? 'Редактирование приёмщика' : 'Новый приёмщик'">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Название" required>
            <UInput v-model="form.name" class="w-full" />
          </UFormField>
          <component :is="configComponent" v-if="configComponent" v-model="form.config" />
          <UFormField label="Включён">
            <USwitch v-model="form.enabled" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" @click="open = false">Отмена</UButton>
          <UButton :loading="saveMutation.isPending.value" @click="saveMutation.mutate()">Сохранить</UButton>
        </div>
      </template>
    </UModal>
  </PageContainer>
</template>
```

> `receiverTypeIcons`/`receiverTypeLabels` — auto-import из `apps/admin/app/utils/receivers.ts` (Nuxt авто-импортирует `utils/`).

- [ ] **Step 2: Commit**

```bash
git add apps/admin/app/pages/tickets/receivers.vue
git commit -m "feat(admin): страница «Приёмщики» (CRUD + тест) (#69)"
```

---

### Task 16: Секция «Приёмщики» в редакторе модалки

**Files:**
- Modify: `apps/admin/app/pages/modals/[id].vue`

- [ ] **Step 1: Добавить receiverIds в форму и загрузку**

В `form` reactive (после `fields`) добавить:

```ts
  receiverIds: [] as string[],
```

В `whenever(modal, ...)` (после `form.fields = ...`) добавить:

```ts
    form.receiverIds = (val.receiverIds as string[]) ?? [];
```

В `updateMutation` `$orpcClient.modals.update({...})` добавить поле:

```ts
      receiverIds: form.receiverIds,
```

- [ ] **Step 2: Загрузить список приёмщиков и отрисовать чекбоксы**

В `<script setup>` добавить запрос:

```ts
const { data: receivers } = useQuery($orpc.formReceivers.list.queryOptions());
```

В шаблоне, в правой колонке (после блока «Статус», внутри `<div class="space-y-3">`), добавить карточку:

```vue
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-3">
            <h3 class="text-sm font-semibold">Приёмщики</h3>
            <p class="text-xs text-(--ui-text-dimmed)">Куда уходит эта форма. Настроить — в разделе «Заявки → Приёмщики».</p>
            <div v-if="!receivers?.length" class="text-xs text-(--ui-text-muted)">
              Приёмщиков нет. <NuxtLink to="/tickets/receivers" class="underline">Добавить</NuxtLink>
            </div>
            <div v-for="r in receivers" :key="r.id" class="flex items-center gap-2">
              <UCheckbox
                :model-value="form.receiverIds.includes(r.id)"
                :label="r.name"
                @update:model-value="(v) => { form.receiverIds = v ? [...form.receiverIds, r.id] : form.receiverIds.filter((x) => x !== r.id); }"
              />
              <UBadge v-if="!r.enabled" color="neutral" variant="subtle" size="xs">выключен</UBadge>
            </div>
          </div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/pages/modals/[id].vue
git commit -m "feat(admin): секция «Приёмщики» в редакторе модалки (#69)"
```

> Замечание: на странице создания модалки (`apps/admin/app/pages/modals/index.vue` или `new.vue` — проверить, как создаётся) `receiverIds` по умолчанию `[]`. Если хотим предотмечать все enabled-приёмщики для новой модалки — это делается в create-форме; но безопасный дефолт `[]` тоже допустим (тогда заявки без выбранной формы всё равно уйдут всем enabled через fallback резолвера — но модалка со slug резолвится в форму с пустым списком → никому). **Поэтому при создании модалки стоит инициализировать `receiverIds` всеми enabled-приёмщиками.** См. Task 16b.

---

### Task 16b: Предотметка всех приёмщиков при создании модалки

**Files:**
- Modify: страница создания модалки (определить: `apps/admin/app/pages/modals/index.vue` содержит модалку создания, либо `apps/admin/app/pages/modals/new.vue`)

- [ ] **Step 1: Найти, где создаётся модалка**

Run: `grep -rn "modals.create" apps/admin/app/pages/modals`
Expected: путь к компоненту/обработчику создания.

- [ ] **Step 2: При создании передавать receiverIds всех enabled**

В обработчике создания модалки добавить запрос `const { data: receivers } = useQuery($orpc.formReceivers.list.queryOptions())` и в `$orpcClient.modals.create({...})` передать:

```ts
      receiverIds: (receivers.value ?? []).filter((r) => r.enabled).map((r) => r.id),
```

> Это реализует «новая форма получает все текущие enabled-приёмщики предотмеченными» из спеки.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/pages/modals
git commit -m "feat(admin): новая модалка предотмечает все enabled-приёмщики (#69)"
```

---

### Task 17: Карточка «Доставка» в детали заявки + ретрай

**Files:**
- Modify: `apps/admin/app/pages/tickets/[id].vue`

- [ ] **Step 1: Добавить мутацию ретрая**

В `<script setup>` после `deleteMutation` добавить:

```ts
const retryMutation = useMutation({
  mutationFn: (deliveryId?: string) =>
    $orpcClient.tickets.retryDelivery({ ticketId: id.value, deliveryId }),
  onSuccess: () => {
    toast.add({ title: "Повтор запущен", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.tickets.getById.queryKey({ input: { id: id.value } }) });
  },
});

function formatDateShort(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
```

- [ ] **Step 2: Добавить карточку доставки в шаблон**

После блока «UTM» (перед закрывающим `</div>` контейнера `max-w-2xl`) добавить:

```vue
        <!-- Доставка -->
        <div v-if="ticket.deliveries?.length" class="border border-(--ui-border) p-6 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Доставка</h2>
            <UButton
              v-if="ticket.deliveries.some((d) => d.status === 'error')"
              variant="outline"
              size="xs"
              icon="i-solar-refresh-linear"
              :loading="retryMutation.isPending.value"
              @click="retryMutation.mutate(undefined)"
            >
              Повторить ошибки
            </UButton>
          </div>
          <div
            v-for="d in ticket.deliveries"
            :key="d.id"
            class="flex items-center gap-3 text-sm"
          >
            <UIcon :name="receiverTypeIcons[d.receiverType] ?? 'i-solar-bell-linear'" class="text-(--ui-text-muted)" />
            <span class="flex-1 text-(--ui-text-highlighted)">{{ d.receiverName }}</span>
            <UBadge :color="deliveryStatusColors[d.status]" variant="subtle" size="xs">
              {{ deliveryStatusLabels[d.status] }}
            </UBadge>
            <span class="text-xs text-(--ui-text-dimmed) tabular-nums">{{ formatDateShort(d.lastAttemptAt) }}</span>
            <UButton
              v-if="d.status === 'error'"
              variant="ghost"
              size="xs"
              icon="i-solar-refresh-linear"
              :loading="retryMutation.isPending.value"
              @click="retryMutation.mutate(d.id)"
            />
          </div>
          <p v-for="d in ticket.deliveries.filter((x) => x.error)" :key="d.id + '-err'" class="text-xs text-red-500">
            {{ d.receiverName }}: {{ d.error }}
          </p>
        </div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/admin/app/pages/tickets/[id].vue
git commit -m "feat(admin): карточка «Доставка» + ретрай в детали заявки (#69)"
```

---

### Task 18: Ссылка на приёмщики со страницы заявок

**Files:**
- Modify: `apps/admin/app/pages/tickets/index.vue:140-148`

- [ ] **Step 1: Заменить кнопку «Настройки» на «Приёмщики»**

В `<template #actions>` заменить `to="/tickets/settings"` на `to="/tickets/receivers"` и текст/иконку:

```vue
      <template #actions>
        <UButton
          to="/tickets/receivers"
          icon="i-solar-inbox-in-linear"
          variant="outline"
        >
          Приёмщики
        </UButton>
      </template>
```

- [ ] **Step 2: Commit**

```bash
git add apps/admin/app/pages/tickets/index.vue
git commit -m "feat(admin): ссылка на «Приёмщики» со страницы заявок (#69)"
```

---

## Phase 5 — Backfill + удаление legacy

### Task 19: Backfill — telegram из `ticket_settings` → приёмщик

**Files:**
- Create: `apps/server/src/scripts/migrate-receivers.ts`
- Modify: `apps/server/package.json` (script)

- [ ] **Step 1: Скрипт backfill**

`apps/server/src/scripts/migrate-receivers.ts`:

```ts
import { db } from "@zhk/db";
import { formReceivers, modals, ticketSettings, sites } from "@zhk/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Одноразовый идемпотентный backfill: глобальный telegram-конфиг ticket_settings
 * → form_receivers (type=telegram) на primary-сайте + проставить его в receiverIds
 * существующих модалок этого сайта.
 */
async function migrate() {
  const settings = await db.query.ticketSettings.findFirst();
  if (!settings?.telegramBotToken || !settings.telegramChatId) {
    console.log("Нет telegram-конфига в ticket_settings — нечего мигрировать.");
    process.exit(0);
  }

  const primary = await db.query.sites.findFirst({ where: eq(sites.isPrimary, true) });
  const siteId = primary?.id ?? settings.siteId;

  // Идемпотентность: не дублируем, если уже есть telegram-приёмщик с этим chatId.
  const existing = await db.query.formReceivers.findMany({
    where: and(eq(formReceivers.siteId, siteId), eq(formReceivers.type, "telegram")),
  });
  const already = existing.find(
    (r) => (r.config as { chatId?: string }).chatId === settings.telegramChatId,
  );

  let receiverId: string;
  if (already) {
    receiverId = already.id;
    console.log(`Telegram-приёмщик уже существует: ${receiverId}`);
  } else {
    const [created] = await db
      .insert(formReceivers)
      .values({
        siteId,
        type: "telegram",
        name: "Telegram",
        config: { botToken: settings.telegramBotToken, chatId: settings.telegramChatId },
        enabled: true,
      })
      .returning({ id: formReceivers.id });
    receiverId = created!.id;
    console.log(`Создан telegram-приёмщик: ${receiverId}`);
  }

  // Проставить приёмщик в модалки сайта, где его ещё нет.
  const siteModals = await db.query.modals.findMany({ where: eq(modals.siteId, siteId) });
  for (const m of siteModals) {
    const ids = (m.receiverIds as string[]) ?? [];
    if (!ids.includes(receiverId)) {
      await db
        .update(modals)
        .set({ receiverIds: [...ids, receiverId] })
        .where(eq(modals.id, m.id));
    }
  }
  console.log(`Обновлено модалок: ${siteModals.length}`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Добавить npm-script**

В `apps/server/package.json` в `scripts` добавить:

```json
    "migrate:receivers": "tsx src/scripts/migrate-receivers.ts"
```

- [ ] **Step 3: Запустить backfill (если в БД есть telegram-конфиг)**

Run: `pnpm --filter server migrate:receivers`
Expected: либо «нечего мигрировать», либо создан приёмщик + обновлены модалки. Идемпотентно при повторном запуске.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/scripts/migrate-receivers.ts apps/server/package.json
git commit -m "feat(server): backfill telegram ticket_settings → приёмщик (#69)"
```

---

### Task 20: Удалить legacy ticketSettings

**Files:**
- Delete: `packages/api/src/routers/ticket-settings.ts`
- Delete: `packages/db/src/schema/ticket-settings.ts`
- Delete: `apps/admin/app/pages/tickets/settings.vue`
- Modify: `packages/api/src/routers/index.ts` (убрать импорт + entry)
- Modify: `packages/db/src/schema/index.ts` (убрать export)

- [ ] **Step 1: Проверить отсутствие других потребителей**

Run: `grep -rn "ticketSettings\|ticket-settings\|ticket_settings" apps packages --include="*.ts" --include="*.vue" | grep -v node_modules | grep -v migrate-receivers`
Expected: только строки в файлах, которые удаляем/правим в этой задаче. Если есть другие — обработать.

- [ ] **Step 2: Удалить файлы**

```bash
git rm packages/api/src/routers/ticket-settings.ts packages/db/src/schema/ticket-settings.ts apps/admin/app/pages/tickets/settings.vue
```

- [ ] **Step 3: Убрать из appRouter**

В `packages/api/src/routers/index.ts` удалить строку импорта `import { ticketSettingsRouter } from "./ticket-settings";` и строку `ticketSettings: ticketSettingsRouter,` из объекта.

- [ ] **Step 4: Убрать из schema index**

В `packages/db/src/schema/index.ts` удалить `export * from "./ticket-settings";`.

- [ ] **Step 5: Удалить таблицу из БД**

Run: `pnpm db:push`
Expected: drizzle-kit предложит удалить таблицу `ticket_settings`. **Подтвердить удаление ИМЕННО этой таблицы** (backfill уже перенёс данные в form_receivers).

- [ ] **Step 6: Проверка типов + тесты**

Run: `pnpm check-types && pnpm test`
Expected: без ошибок, тесты зелёные.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: удалить legacy ticketSettings после миграции на приёмщики (#69)"
```

---

## Phase 6 — Документация и проверка

### Task 21: Документация

**Files:**
- Create: `docs/receivers.md`
- Modify: `CLAUDE.md` (короткий раздел + ссылка)

- [ ] **Step 1: Написать `docs/receivers.md`**

Кратко описать: реестр (`packages/api/src/shared/receivers` метаданные / `packages/api/src/services/receivers` deliver), как добавить новый тип приёмщика (создать 2 файла + зарегистрировать в обоих index + добавить config-редактор `*ReceiverConfig.vue` в admin), модель данных (`form_receivers` per-site, `modals.receiverIds`, `form_deliveries` лог), резолв по `source`, фоновую доставку, ретрай, env `SMTP_*`. Контракт `DeliveryContext`.

- [ ] **Step 2: Добавить раздел в CLAUDE.md**

После раздела «Rate limiting» добавить короткий раздел «## Приёмщики форм» с 3-4 строками и ссылкой на `docs/receivers.md`.

- [ ] **Step 3: Commit**

```bash
git add docs/receivers.md CLAUDE.md
git commit -m "docs(receivers): руководство по системе приёмщиков (#69)"
```

---

### Task 22: E2E-проверка через preview

> Финальная проверка реального пути (как в feat/65/66): preview-стек (server :3000 / admin :3002 / web :3001 на реальной БД, опора на существующую сессию админки).

- [ ] **Step 1: Поднять preview-серверы** (`preview_start` для admin и server; web при необходимости).

- [ ] **Step 2: Приёмщики CRUD** — открыть `/tickets/receivers`, создать webhook (на https://webhook.site или локальный приёмник), telegram, email; проверить «Проверить» для webhook (приходит POST с `DeliveryContext`). Подтвердить запись в БД (`form_receivers`).

- [ ] **Step 3: Привязка к форме** — в модалке выбрать приёмщики, сохранить; проверить `modals.receiver_ids` в БД.

- [ ] **Step 4: Сабмит формы → доставка** — отправить заявку через модалку на web (или вызвать `public.tickets.create` curl'ом: `curl -X POST http://localhost:3000/rpc/public/tickets/create -H 'content-type: application/json' -H 'x-forwarded-host: <slug>.localhost' --data '{"json":{"phone":"+79990000000","source":"modal:<slug>"}}'`). Проверить: тикет создан с `site_id`, в `form_deliveries` появились строки, статусы стали `ok` (webhook получил payload).

- [ ] **Step 5: Лог + ретрай** — открыть деталь заявки `/tickets/{id}`, увидеть карточку «Доставка»; для заведомо падающего приёмщика (webhook на неверный URL) статус `error`, нажать «Повторить» → перезапуск.

- [ ] **Step 6: Email** — при наличии SMTP в env проверить доставку письма; без SMTP — статус `error` «SMTP не настроен» (ожидаемо).

- [ ] **Step 7: Зафиксировать результаты** в комментарии к issue #69 и обновить память (заметка про feat/69 в MEMORY.md).

---

## Self-Review (выполнено при написании плана)

- **Spec coverage:** реестр (Task 2,7,14), DeliveryContext (Task 3), per-site form_receivers (Task 1,10), modals.receiverIds + form-agnostic резолв (Task 1,8,11,13,16), form_deliveries лог (Task 1,9,12,17), фоновая доставка (Task 11), 3 типа deliver (Task 4,5,6), env SMTP (Task 6), admin UI (Task 14-18), миграция telegram + удаление ticketSettings (Task 19,20), тесты (Task 2-9,13), docs (Task 21), E2E (Task 22). Пробелов нет.
- **Placeholder scan:** код приведён во всех code-шагах; backend/pure — полностью, SFC — полные компоненты.
- **Type consistency:** `Deliverer`/`DeliveryContext`/`DeliveryResult`/`ReceiverDefinition` едины (определены в `_core.ts`); `parseReceiverConfig`/`receiverTypes`/`receiverDefByType`/`getReceiverDefaultConfig` — из `shared/receivers/index.ts`; `deliverers`/`buildDeliveryContext`/`resolveReceiverIds`/`processTicketDeliveries`/`createPendingDeliveries` — из `services/receivers`. Имена совпадают между задачами.
- **Известные точки внимания:** (1) циклический импорт tickets↔form-deliveries в relations (Task 12 Step 2 — note); (2) порядок ре-экспортов в `services/receivers/index.ts` относительно создания resolve/dispatch (Task 7 note); (3) `siteProcedure` не несёт `context.site` — в `formReceivers.test` имя сайта опционально.
