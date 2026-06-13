# Наблюдаемость (evlog + опц. GlitchTip) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сквозной слой наблюдаемости на `evlog` (AI-читаемые структурные ошибки + wide events) с опциональным дрейном в self-hosted GlitchTip через env-DSN.

**Architecture:** Новый пакет `packages/observability` инкапсулирует конфиг evlog (env-gated дрейн + редакция PII + каталог доменных ошибок). Server (Hono/oRPC) инструментируется полностью (wide event на запрос, Better Auth-идентификация, `app.onError`, каталог ошибок). Admin/web ловят клиентские ошибки и через evlog-transport шлют на сервер, который дренит в GlitchTip (DSN не светится в браузере).

**Tech Stack:** evlog v2.x (MIT), Hono, oRPC (`@orpc/server`), Nuxt 4, Better Auth (`@zhk/auth`), Drizzle/PostgreSQL. GlitchTip (внешний, Sentry-совместимый).

**Issue:** [#64](https://github.com/alshchetinin/zhk-starter/issues/64) · **Спека:** [../specs/2026-06-13-observability-evlog-glitchtip-design.md](../specs/2026-06-13-observability-evlog-glitchtip-design.md)

> **Тесты:** CRUD/HTTP-слой в репо юнит-тестами не покрыт; верификация — `pnpm check-types` + ручная. Детерминированную логику (каталог ошибок, форма redact) покрываем vitest в `packages/observability/__tests__` (в репо vitest уже есть, `pnpm test`).

> **evlog API (сверено с докой 2026-06-13):** `initLogger({ enabled, env, pretty, minLevel, silent, stringify, sampling, redact, drain })`; `createError({ code, message, status, why, fix, link })`; `defineErrorCatalog('prefix', {...})`; `parseError(err)`; `evlog/hono` → `evlog()` middleware + `EvlogVariables` + `c.get('log')`; `evlog/orpc` → `evlog()` procedure-middleware + `withEvlog(handler)` + `EvlogOrpcContext`, `context.log`/`useLogger()`; `evlog/sentry` → `createSentryDrain({ dsn, environment, release, tags, timeout })` (по умолчанию читает `SENTRY_DSN`, передаём `dsn` явно); `evlog/better-auth` → `createAuthMiddleware(auth, {exclude})`, `identifyUser(log, session)`, `maskEmail`; `evlog/nuxt` модуль + `transport: { enabled, endpoint }` (client→server) + Nitro-хук `evlog:drain`.

---

## File Structure

**Создаём:**
- `packages/observability/` — пакет `@zhk/observability`: конфиг evlog, env-gated дрейн, каталог доменных ошибок, redact-конфиг. (по образцу `packages/ratelimit`)
  - `package.json`, `tsconfig.json`, `src/index.ts`, `src/config.ts`, `src/errors.ts`, `src/__tests__/errors.test.ts`
- `docs/observability/glitchtip.compose.yml` — standalone GlitchTip для локальной проверки (вне основного compose).
- `docs/observability.md` — дока: архитектура, как читать ошибки, runbook GlitchTip, как добавлять ошибки в каталог.
- `apps/web/server/plugins/evlog-drain.ts` и `apps/admin/server/plugins/evlog-drain.ts` — Nitro-плагины регистрации дрейна.

**Модифицируем:**
- `packages/env/src/server.ts` — добавить `GLITCHTIP_DSN` (optional).
- `apps/server/src/index.ts` — `initObservability()`, `app.onError`, обёртка oRPC.
- `packages/api/src/orpc-base.ts` — `EvlogOrpcContext` + `evlog()` на базовый `o`.
- `apps/server/src/scheduler.ts`, `apps/server/src/seed.ts` — `console.error` → структурный evlog.
- `apps/admin/nuxt.config.ts`, `apps/web/nuxt.config.ts` — модуль `evlog/nuxt` + transport.
- корневой `package.json`/`pnpm-workspace` — пакет подхватится автоматически (workspaces: `packages/*`).

---

## Task 1: Локальный GlitchTip + спайк дрейна (DECISION GATE)

**Files:**
- Create: `docs/observability/glitchtip.compose.yml`
- Create (временный): `apps/server/src/_evlog-spike.ts` (удаляется в конце задачи)

Это **спайк**, не TDD. Цель — узнать, долетает ли `evlog/sentry`-дрейн в GlitchTip как issue.

- [ ] **Step 1: docker-compose локального GlitchTip**

Create `docs/observability/glitchtip.compose.yml` (официальная схема GlitchTip 4 контейнера; порт 8000):

```yaml
# Локальный GlitchTip для проверки дрейна. НЕ часть compose проекта.
# Запуск:  docker compose -f docs/observability/glitchtip.compose.yml up -d
x-environment: &env
  SECRET_KEY: change-me-dev-only-secret-key
  DATABASE_URL: postgres://postgres:postgres@gt-postgres:5432/postgres
  REDIS_URL: redis://gt-redis:6379/0
  GLITCHTIP_DOMAIN: http://localhost:8000
  DEFAULT_FROM_EMAIL: glitchtip@localhost
  CELERY_WORKER_AUTOSCALE: "1,2"
services:
  gt-postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_PASSWORD: postgres }
    volumes: [gt-pg:/var/lib/postgresql/data]
  gt-redis:
    image: redis:7-alpine
  gt-web:
    image: glitchtip/glitchtip:latest
    depends_on: [gt-postgres, gt-redis]
    ports: ["8000:8080"]
    environment: *env
  gt-worker:
    image: glitchtip/glitchtip:latest
    command: ./bin/run-celery-with-beat.sh
    depends_on: [gt-postgres, gt-redis]
    environment: *env
  gt-migrate:
    image: glitchtip/glitchtip:latest
    command: ./bin/run-migrate.sh
    depends_on: [gt-postgres, gt-redis]
    environment: *env
volumes:
  gt-pg:
```

- [ ] **Step 2: Поднять и создать проект**

```bash
docker compose -f docs/observability/glitchtip.compose.yml up -d
```
Подождать ~30-60с (миграции). Открыть `http://localhost:8000`, зарегистрировать локального юзера (первый юзер становится админом), создать Organization + Project (платформа: Node/JavaScript). Скопировать **DSN** проекта (вид `http://<key>@localhost:8000/1`).
Expected: дашборд GlitchTip доступен, есть DSN.

- [ ] **Step 3: Минимальный спайк-скрипт дрейна**

Create `apps/server/src/_evlog-spike.ts`:

```ts
import { initLogger, createError, log } from "evlog";
import { createSentryDrain } from "evlog/sentry";

const dsn = process.env.GLITCHTIP_DSN;
if (!dsn) { console.error("set GLITCHTIP_DSN"); process.exit(1); }

initLogger({
  env: { service: "spike", environment: "development" },
  pretty: true,
  drain: createSentryDrain({ dsn }),
});

log.error(
  createError({
    code: "SPIKE_TEST",
    message: "evlog→GlitchTip spike",
    status: 500,
    why: "Проверка совместимости дрейна с GlitchTip",
    fix: "Если видно в дашборде — путь A; если нет — фолбэк @sentry/node",
  }),
);

// дать дрейну отправить
await new Promise((r) => setTimeout(r, 3000));
process.exit(0);
```

- [ ] **Step 4: Установить evlog и запустить спайк**

```bash
pnpm --filter server add evlog
GLITCHTIP_DSN="<DSN из шага 2>" pnpm --filter server exec tsx src/_evlog-spike.ts
```
Подождать ~10с, обновить GlitchTip-дашборд (Issues).

- [ ] **Step 5: Зафиксировать решение (DECISION GATE)**

Дописать в начало `docs/observability.md` (создать файл) блок:

```markdown
## Решение по дрейну evlog→GlitchTip (спайк 2026-06-13)
- Результат: <ДОЛЕТАЕТ | НЕ ДОЛЕТАЕТ> — ошибка SPIKE_TEST <видна | не видна> в GlitchTip Issues.
- Выбранный путь: <A: только evlog-дрейн | B: фолбэк @sentry/node для issues>.
```
**Если ДОЛЕТАЕТ → путь A** (Task 3 использует `createSentryDrain` как в плане).
**Если НЕ ДОЛЕТАЕТ → путь B** (в Task 3 выполнить блок «Фолбэк B»).

- [ ] **Step 6: Убрать спайк-скрипт, оставить compose и решение**

```bash
rm apps/server/src/_evlog-spike.ts
git add docs/observability/glitchtip.compose.yml docs/observability.md apps/server/package.json pnpm-lock.yaml
git commit -m "chore(observability): локальный GlitchTip + спайк дрейна evlog→GlitchTip (#64)"
```

---

## Task 2: Пакет `@zhk/observability`

**Files:**
- Create: `packages/observability/package.json`, `tsconfig.json`, `src/index.ts`, `src/config.ts`, `src/errors.ts`
- Create: `packages/observability/src/__tests__/errors.test.ts`
- Modify: `packages/env/src/server.ts`

- [ ] **Step 1: env-схема — добавить `GLITCHTIP_DSN`**

In `packages/env/src/server.ts`, add to the zod schema (рядом с другими optional-переменными, напр. после `REDIS_URL`):

```ts
GLITCHTIP_DSN: z.string().optional(),
```
(Если схема использует `.optional()`-паттерн — следовать ему; прочитать файл и вставить в том же стиле.)

- [ ] **Step 2: package.json пакета**

Create `packages/observability/package.json` (по образцу `packages/ratelimit/package.json` — прочитать его для точных версий/полей):

```json
{
  "name": "@zhk/observability",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./errors": "./src/errors.ts"
  },
  "dependencies": {
    "@zhk/env": "workspace:*",
    "evlog": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@zhk/config": "workspace:*"
  }
}
```
Note: если в репо нет `catalog:`-записи для `evlog`, указать конкретную версию (`"evlog": "^2.19.1"`) и/или добавить в `pnpm-workspace.yaml` catalog. Проверить как сделано для других пакетов.

- [ ] **Step 3: tsconfig.json пакета**

Create `packages/observability/tsconfig.json` — скопировать содержимое `packages/ratelimit/tsconfig.json` (тот же extends `@zhk/config`).

- [ ] **Step 4: Каталог доменных ошибок**

Create `packages/observability/src/errors.ts`:

```ts
import { defineErrorCatalog } from "evlog";

// Доменные ошибки приложения. Каждая несёт why/fix/link для AI-читаемости.
// Бросаются из oRPC-процедур; evlog/orpc middleware мостит их в ORPCError.
export const appErrors = defineErrorCatalog("app", {
  NOT_FOUND: {
    status: 404,
    message: ({ entity }: { entity: string }) => `${entity} не найден`,
    why: "Запись отсутствует в текущем сайте/скоупе либо удалена",
    fix: "Проверьте id и siteId; запись могла быть удалена каскадом",
  },
  RATE_LIMITED: {
    status: 429,
    message: "Слишком много запросов",
    why: "Превышен лимит на горячей ручке (rate-limit middleware)",
    fix: "Повторите позже; при ложных срабатываниях см. docs/rate-limiting.md",
    link: "docs/rate-limiting.md",
  },
  SITE_LOCKED: {
    status: 403,
    message: "Сайт под паролем или неактивен",
    why: "Сайт неактивен или требует разблокировки по паролю",
    fix: "Активируйте сайт или передайте валидный site-unlock cookie",
  },
});
```

- [ ] **Step 5: Тест каталога ошибок**

Create `packages/observability/src/__tests__/errors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseError } from "evlog";
import { appErrors } from "../errors";

describe("appErrors catalog", () => {
  it("derives wire code app.NOT_FOUND and renders dynamic message", () => {
    const err = appErrors.NOT_FOUND({ entity: "Страница" });
    const parsed = parseError(err);
    expect(parsed.code).toBe("app.NOT_FOUND");
    expect(parsed.status).toBe(404);
    expect(parsed.message).toContain("Страница");
  });

  it("static error carries why/fix", () => {
    const parsed = parseError(appErrors.RATE_LIMITED());
    expect(parsed.code).toBe("app.RATE_LIMITED");
    expect(parsed.status).toBe(429);
  });
});
```

- [ ] **Step 6: Запустить тест (должен пройти после создания errors.ts)**

Run: `pnpm vitest run packages/observability`
Expected: PASS (2 теста). Если `parseError` возвращает иную форму — скорректировать ассерты под фактический API (прочитать тип `parseError`).

- [ ] **Step 7: Конфиг observability (env-gated дрейн + редакция)**

Create `packages/observability/src/config.ts`:

```ts
import { initLogger } from "evlog";
import { createSentryDrain } from "evlog/sentry";
import { env } from "@zhk/env/server";

let initialized = false;

// Вызывается один раз на старте серверного процесса. Идемпотентно.
export function initObservability(service: string) {
  if (initialized) return;
  initialized = true;

  const dsn = env.GLITCHTIP_DSN;
  initLogger({
    env: {
      service,
      environment: process.env.NODE_ENV ?? "development",
    },
    // pretty в dev (auto по NODE_ENV), JSON в прод
    redact: {
      // дефолты evlog уже маскируют email/phone/IP/JWT/bearer/IBAN/cards.
      // Добавляем доменные поля лидов/тикетов.
      paths: ["password", "accessPassword", "*_token", "phone", "leadEmail"],
    },
    // Пусто → дрейн выключен (только console). Задан → шлём в GlitchTip.
    drain: dsn ? createSentryDrain({ dsn }) : undefined,
  });
}
```

- [ ] **Step 8: index.ts ре-экспорт**

Create `packages/observability/src/index.ts`:

```ts
export { initObservability } from "./config";
export { appErrors } from "./errors";
// удобный ре-экспорт ходовых хелперов evlog
export { createError, parseError, log, useLogger } from "evlog";
```

- [ ] **Step 9: check-types + commit**

Run: `pnpm check-types`
Expected: пакет `@zhk/observability` без ошибок (другие пакеты ещё не используют его).

```bash
git add packages/observability packages/env/src/server.ts pnpm-lock.yaml
git commit -m "feat(observability): пакет @zhk/observability (конфиг evlog, каталог ошибок, env-gated дрейн) (#64)"
```

---

## Task 3: Инструментирование server (Hono + oRPC)

**Files:**
- Modify: `packages/api/src/orpc-base.ts`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/package.json` (зависимость `@zhk/observability`, `evlog`)

- [ ] **Step 1: Зависимости server**

```bash
pnpm --filter server add @zhk/observability@workspace:* evlog
pnpm --filter @zhk/api add evlog @zhk/observability@workspace:*
```

- [ ] **Step 2: oRPC base — evlog middleware + типизированный context.log**

In `packages/api/src/orpc-base.ts`, replace the content with:

```ts
import { os } from "@orpc/server";
import { evlog, type EvlogOrpcContext } from "evlog/orpc";
import { identifyUser } from "evlog/better-auth";
import type { Context } from "./context";

// Базовый builder с evlog: каждая процедура получает context.log,
// wide event тегируется именем операции, structured errors мостятся в ORPCError.
export const o = os.$context<Context & EvlogOrpcContext>().use(evlog());

// Идентификация юзера на wide event из уже резолвнутой сессии (без повторного
// чтения cookie — сессия есть в context).
const identify = o.middleware(async ({ context, next }) => {
  if (context.session) identifyUser(context.log, context.session);
  return next();
});

export const publicProcedure = o.use(identify);
```

Note: `Context` уже содержит `session`/`siteId` (см. `./context`). `EvlogOrpcContext` добавляет `log`. Если `identifyUser` ждёт иную форму сессии — привести `context.session` к ожидаемому виду (прочитать тип в `evlog/better-auth`).

- [ ] **Step 3: Server — initObservability + обёртка oRPC + app.onError**

In `apps/server/src/index.ts`:

(a) Добавить импорты вверху:
```ts
import { initObservability, parseError } from "@zhk/observability";
import { withEvlog } from "evlog/orpc";
```

(b) Сразу после импортов, до `const app = new Hono()`:
```ts
initObservability("zhk-server");
```

(c) Заменить создание хендлера:
```ts
const rpcHandler = new RPCHandler(appRouter);
```
на обёрнутый в evlog (одно wide event на RPC-запрос):
```ts
const rpcHandler = withEvlog(new RPCHandler(appRouter));
```

(d) Заменить hono `logger()` (строка `app.use(logger())`) — убрать его (evlog даёт wide events; hono logger дублирует), удалив строку `app.use(logger());` и импорт `import { logger } from "hono/logger";`.

(e) Добавить `app.onError` перед `serve(...)`:
```ts
app.onError((error, c) => {
  const parsed = parseError(error);
  return c.json({ message: parsed.message, code: parsed.code }, (parsed.status ?? 500) as 500);
});
```

> **Фолбэк B (только если спайк Task 1 показал, что дрейн НЕ долетает в GlitchTip):**
> В `apps/server/src/index.ts` дополнительно подключить Sentry-SDK для issue-трекинга:
> ```bash
> pnpm --filter server add @sentry/node
> ```
> ```ts
> import * as Sentry from "@sentry/node";
> if (env.GLITCHTIP_DSN) Sentry.init({ dsn: env.GLITCHTIP_DSN, environment: process.env.NODE_ENV });
> // в app.onError перед return:
> if (env.GLITCHTIP_DSN) Sentry.captureException(error);
> ```
> И в `packages/observability/src/config.ts` оставить `drain: undefined` (evlog только для логов/console), убрав `createSentryDrain`. evlog продолжает давать AI-читаемые structured errors в консоль/stdout, Sentry-SDK — issues в GlitchTip.

- [ ] **Step 4: check-types**

Run: `pnpm check-types`
Expected: server + @zhk/api без новых ошибок. Если `withEvlog`/`evlog()` типы конфликтуют с `RPCHandler` из `@orpc/server/fetch` — свериться с `evlog/orpc` докой по точной сигнатуре (возможно, обёртка применяется к `.handle`, а не к конструктору); скорректировать.

- [ ] **Step 5: Ручная проверка wide event + structured error**

```bash
pnpm dev:server
```
В другом терминале дёрнуть несуществующий ресурс через админку или curl на `/rpc/...`. 
Expected: в логах сервера — pretty wide event с роутом/таймингом/`userId` (если залогинен) и, при ошибке, блок error с message/why/fix. При заданном `GLITCHTIP_DSN` (путь A) — issue появляется в GlitchTip.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/orpc-base.ts apps/server/src/index.ts apps/server/package.json packages/api/package.json pnpm-lock.yaml
git commit -m "feat(server): инструментирование evlog (oRPC wide events, Better Auth id, app.onError) (#64)"
```

---

## Task 4: Принять каталог ошибок в горячих процедурах

**Files:**
- Modify: `packages/api/src/routers/pages.ts` (пример NOT_FOUND)
- Modify: `packages/api/src/middleware/rate-limit.ts` (пример RATE_LIMITED) — если бросает ORPCError

- [ ] **Step 1: Заменить ad-hoc ORPCError на каталог (пример pages)**

In `packages/api/src/routers/pages.ts`, заменить throws вида:
```ts
throw new ORPCError("NOT_FOUND", { message: "Page not found" });
```
на:
```ts
throw appErrors.NOT_FOUND({ entity: "Страница" });
```
Добавить импорт: `import { appErrors } from "@zhk/observability/errors";`. Убрать неиспользуемый `ORPCError`-импорт, если он больше не нужен в файле.

Note: evlog/orpc middleware мостит structured error в ORPCError-ответ (status/code/message сохраняются), поэтому клиентский контракт не ломается. Проверить, что `parsed.code` `"app.NOT_FOUND"` ок для клиента (клиент сейчас не ветвится по code — см. админку).

- [ ] **Step 2: check-types + ручная проверка**

Run: `pnpm check-types`; затем `pnpm dev:server` и дёрнуть getById несуществующей страницы.
Expected: ответ 404 с message «Страница не найден», в логе — structured error с why/fix.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/routers/pages.ts
git commit -m "refactor(api): доменные ошибки страниц через каталог evlog (why/fix) (#64)"
```

---

## Task 5: Структурное логирование scheduler/seed

**Files:**
- Modify: `apps/server/src/scheduler.ts`
- Modify: `apps/server/src/seed.ts`

- [ ] **Step 1: scheduler — console.error → evlog**

In `apps/server/src/scheduler.ts`, заменить `console.error("[scheduler] ...", err)` вызовы на:
```ts
log.error({ scope: "scheduler", action: "<tick|cleanup|sync>", error: err });
```
Добавить импорт `import { log } from "@zhk/observability";`. (Для sync с `integration.id` добавить поле `integrationId: integration.id`.)

- [ ] **Step 2: seed — оставить console (это CLI-скрипт)**

seed.ts — отдельный CLI (`tsx src/seed.ts`), evlog там избыточен. Оставить `console.error` как есть. (Явно ничего не меняем — задача про scheduler.)

- [ ] **Step 3: check-types + commit**

Run: `pnpm check-types`
```bash
git add apps/server/src/scheduler.ts
git commit -m "refactor(server): scheduler логирует ошибки через evlog (#64)"
```

---

## Task 6: Клиентский перехват ошибок (admin + web)

**Files:**
- Modify: `apps/admin/nuxt.config.ts`, `apps/web/nuxt.config.ts`
- Create: `apps/admin/server/plugins/evlog-drain.ts`, `apps/web/server/plugins/evlog-drain.ts`
- Modify: `apps/admin/package.json`, `apps/web/package.json`

- [ ] **Step 1: Зависимости**

```bash
pnpm --filter zhk-admin add evlog @zhk/observability@workspace:*
pnpm --filter zhk-web add evlog @zhk/observability@workspace:*
```

- [ ] **Step 2: Модуль evlog/nuxt + transport (admin)**

In `apps/admin/nuxt.config.ts`, добавить в `modules` массив `'evlog/nuxt'` и блок:

```ts
  evlog: {
    env: { service: "zhk-admin" },
    // клиентские ошибки уходят на сервер (Nitro), DSN в браузер не попадает
    transport: { enabled: true, endpoint: "/api/_evlog/ingest" },
  },
```
То же самое в `apps/web/nuxt.config.ts` с `service: "zhk-web"`.

- [ ] **Step 3: Nitro-плагин дрейна (admin)**

Create `apps/admin/server/plugins/evlog-drain.ts`:

```ts
import { createSentryDrain } from "evlog/sentry";

// Серверная сторона Nuxt: получает и клиентские (source:'client'), и серверные
// события и дренит их в GlitchTip, если задан DSN. Пусто → только console.
export default defineNitroPlugin((nitroApp) => {
  const dsn = process.env.GLITCHTIP_DSN;
  if (!dsn) return;
  nitroApp.hooks.hook("evlog:drain", createSentryDrain({ dsn }));
});
```
Создать идентичный `apps/web/server/plugins/evlog-drain.ts`.

> **Фолбэк B (если выбран на спайке):** вместо `createSentryDrain` использовать `@sentry/node` + `Sentry.captureException` в обработчике `evlog:drain` (или `@sentry/nuxt` модуль с `dsn: GLITCHTIP_DSN`). evlog-transport всё равно нужен, чтобы клиентские ошибки доходили до сервера.

- [ ] **Step 4: check-types + ручная проверка**

Run: `pnpm check-types`
Затем `pnpm dev:admin`, в браузере спровоцировать клиентскую ошибку (например, бросить в обработчике кнопки `throw createError({ message: 'test client error' })`).
Expected: ошибка видна в серверном логе админки (source: client) с контекстом; при DSN — долетает в GlitchTip. Убедиться, что `GLITCHTIP_DSN` пустой → приложение работает штатно.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/nuxt.config.ts apps/web/nuxt.config.ts apps/admin/server/plugins/evlog-drain.ts apps/web/server/plugins/evlog-drain.ts apps/admin/package.json apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web/admin): перехват клиентских ошибок через evlog + transport в GlitchTip (#64)"
```

---

## Task 7: Документация

**Files:**
- Modify: `docs/observability.md` (создан в Task 1 — дополнить)
- Modify: `CLAUDE.md` (короткий раздел-указатель)

- [ ] **Step 1: Дописать docs/observability.md**

Дополнить файл разделами (после блока решения из Task 1):
- **Архитектура:** слои (evlog в server/admin/web → env-gated дрейн → GlitchTip), что инструментировано.
- **Как читать ошибки (человек и ИИ):** структура wide event, поля structured error (`code`/`why`/`fix`/`link`), пример pretty-вывода.
- **Каталог ошибок:** где (`packages/observability/src/errors.ts`), как добавить запись, конвенция why/fix/link.
- **Включить дрейн:** `GLITCHTIP_DSN` в `.env` (пусто → выкл).
- **Локальный GlitchTip:** команда запуска compose, создание проекта, копирование DSN.
- **Прод (Phase 2):** заметка-указатель «деплой на Coolify — отдельной фазой».

- [ ] **Step 2: Указатель в CLAUDE.md**

In `/Users/alex/project/zhk-starter/CLAUDE.md`, добавить раздел (рядом с «Rate limiting»):

```markdown
## Наблюдаемость

Ошибки и структурные логи — на `evlog` (`packages/observability`). Server даёт wide
events на запрос (Better Auth-идентификация, PII-редакция, `app.onError`), доменные
ошибки — каталог `appErrors` (`why`/`fix`/`link`, AI-читаемые). Admin/web ловят
клиентские ошибки и через evlog-transport шлют на сервер. Дрейн в GlitchTip
включается env-переменной `GLITCHTIP_DSN` (пусто → только console). Подробности и
runbook локального GlitchTip: [`docs/observability.md`](docs/observability.md).
```

- [ ] **Step 3: Commit**

```bash
git add docs/observability.md CLAUDE.md
git commit -m "docs(observability): руководство по evlog + GlitchTip (#64)"
```

---

## Финальная верификация

- [ ] **check-types по всему монорепо**

Run: `pnpm check-types`
Expected: нет новых ошибок (pre-existing — игнор, как зафиксировано в #63).

- [ ] **Тесты**

Run: `pnpm test`
Expected: все проходят, включая новые тесты каталога ошибок в `packages/observability`.

- [ ] **Smoke (с выключенным и включённым DSN)**

`pnpm dev:server` + `pnpm dev:admin`:
1. `GLITCHTIP_DSN` пустой → приложение работает, ошибки видны в pretty-консоли с why/fix.
2. `GLITCHTIP_DSN=<локальный>` → серверная и клиентская ошибки долетают в локальный GlitchTip.

- [ ] **Обновить issue**

```bash
gh issue comment 64 --body "Phase 1 реализована по плану docs/superpowers/plans/2026-06-13-observability-evlog.md. Готово к ревью. Phase 2 (прод-GlitchTip на Coolify) — отдельно."
```
