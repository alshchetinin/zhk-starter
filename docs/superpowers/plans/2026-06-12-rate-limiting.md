# Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Защитить публичные формы и критические API-ручки zhk-starter от спама и брутфорса через rate limiting (точечный oRPC middleware + better-auth + Hono-потолок), единое хранилище Redis с in-memory fallback.

**Architecture:** Новый пакет `packages/ratelimit` инкапсулирует движок (`rate-limiter-flexible` + `ioredis`), определение IP клиента и конфиг лимитов. oRPC middleware-фабрика навешивается точечно на горячие процедуры; better-auth получает встроенный rateLimit на том же Redis; тонкий Hono-middleware даёт общий per-IP потолок. Fail-mode (open/closed) зашит в конструкцию каждого лимитера через наличие/отсутствие insurance-limiter.

**Tech Stack:** rate-limiter-flexible, ioredis, oRPC, better-auth, Hono, Zod (@zhk/env), vitest.

**Спека:** `docs/superpowers/specs/2026-06-12-rate-limiting-design.md` · **Issue:** #59 · **Ветка:** `feat/59-rate-limiting`

**Контекст для исполнителя (фактическое состояние):**

- Сервер `apps/server/src/index.ts`: Hono + `logger()` + `cors()`, auth на `/api/auth/*`, oRPC `RPCHandler` смонтирован на `/rpc` через `app.use("/*", ...)`. Context создаётся `createContext({ context: c })`.
- `packages/api/src/context.ts`: `createContext` возвращает `{ session, siteId, site, cookieHeader, responseHeaders }`. **IP клиента сейчас НЕ извлекается** — добавим `clientIp`.
- `packages/api/src/index.ts`: процедуры через `o.middleware(...)`; экспортируются `publicProcedure`, `publicSiteProcedure`, `publicActiveSiteProcedure` и др. `o = os.$context<Context>()`.
- Горячие ручки: `routers/public/tickets.ts` (create), `routers/public/site.ts` (unlock), `routers/public/contacts.ts` (getByIds — `z.array(z.string())` без max).
- `packages/auth/src/index.ts`: betterAuth, без rateLimit.
- `packages/env/src/server.ts`: t3-env Zod, без REDIS_URL.
- Web-формы: `apps/web/app/components/ModalProvider.vue` (`$orpcClient.public.tickets.create`), `SitePasswordGate.vue` → `apps/web/server/api/site/unlock.post.ts` → `/rpc/public/site/unlock`.
- Монорепо pnpm workspaces (`apps/*`, `packages/*`), catalog в `pnpm-workspace.yaml`. Vitest настроен (`pnpm test`, include `packages/**/__tests__` + `apps/**/__tests__`).
- Нет docker-compose в корне; БД-сервисы — через `turbo db:start` (`packages/db`). Проверь `packages/db` на наличие compose-файла для Postgres и добавь Redis туда же.

---

### Task 1: Redis-сервис локально + REDIS_URL в env

**Files:**
- Modify: docker-compose для БД (найди: `find . -name 'docker-compose*' -not -path '*/node_modules/*'` — вероятно `packages/db/docker-compose.yml` или `compose.yaml`)
- Modify: `packages/env/src/server.ts`
- Modify: `.env.example` (если есть в корне или packages/db; иначе пропусти с пометкой)

- [ ] **Step 1: Найти compose-файл и добавить Redis**

Run: `find . -name 'docker-compose*' -o -name 'compose*.y*ml' | grep -v node_modules`

В найденный compose рядом с сервисом postgres добавь:

```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --save "" --appendonly no
    restart: unless-stopped
```

(`--save "" --appendonly no` — без персистентности, счётчики лимитов эфемерны.)

- [ ] **Step 2: Добавить REDIS_URL в env-схему**

В `packages/env/src/server.ts` в объект `server: {...}` добавь после `NODE_ENV`:

```ts
    REDIS_URL: z.string().url().default("redis://localhost:6379"),
```

И опциональные оверрайды лимитов (все optional, парсятся в config-пакете):

```ts
    RL_AUTH_SIGNIN_POINTS: z.coerce.number().int().positive().optional(),
    RL_AUTH_SIGNIN_DURATION: z.coerce.number().int().positive().optional(),
    RL_SITE_UNLOCK_POINTS: z.coerce.number().int().positive().optional(),
    RL_SITE_UNLOCK_DURATION: z.coerce.number().int().positive().optional(),
    RL_TICKET_CREATE_POINTS: z.coerce.number().int().positive().optional(),
    RL_TICKET_CREATE_DURATION: z.coerce.number().int().positive().optional(),
    RL_TICKET_HOURLY_POINTS: z.coerce.number().int().positive().optional(),
    RL_CONTACTS_GETBYIDS_POINTS: z.coerce.number().int().positive().optional(),
    RL_PUBLIC_READ_POINTS: z.coerce.number().int().positive().optional(),
    RL_HONO_CEILING_POINTS: z.coerce.number().int().positive().optional(),
    RL_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
```

- [ ] **Step 3: Проверить, что env собирается**

Run: `pnpm --filter @zhk/env exec tsc --noEmit` (если у @zhk/env нет своего tsc — пропусти; проверка будет на Step ниже через серверный check-types)
Expected: без новых ошибок.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(infra): Redis-сервис локально + REDIS_URL и RL_* в env (#59)"
```
Трейлер: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (через пустую строку).

---

### Task 2: Пакет `packages/ratelimit` — скелет + getClientIp (TDD)

**Files:**
- Create: `packages/ratelimit/package.json`
- Create: `packages/ratelimit/tsconfig.json`
- Create: `packages/ratelimit/src/client-ip.ts`
- Create: `packages/ratelimit/src/index.ts`
- Test: `packages/ratelimit/src/__tests__/client-ip.test.ts`

- [ ] **Step 1: Создать package.json**

`packages/ratelimit/package.json`:

```json
{
  "name": "@zhk/ratelimit",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "ioredis": "^5.4.1",
    "rate-limiter-flexible": "^5.0.4",
    "@zhk/env": "workspace:*"
  },
  "devDependencies": {
    "@zhk/config": "workspace:*",
    "typescript": "catalog:"
  }
}
```

`packages/ratelimit/tsconfig.json` (скопируй структуру из `packages/api/tsconfig.json` — посмотри его; обычно `{ "extends": "@zhk/config/tsconfig.base.json", "include": ["src"] }`).

- [ ] **Step 2: Установить зависимости**

Run: `pnpm install`
Expected: ioredis и rate-limiter-flexible добавлены, workspace связан.

- [ ] **Step 3: Написать падающий тест getClientIp**

`packages/ratelimit/src/__tests__/client-ip.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getClientIp } from "../client-ip";

function h(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("getClientIp", () => {
  it("берёт первый IP из x-forwarded-for", () => {
    expect(getClientIp(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("триммит пробелы", () => {
    expect(getClientIp(h({ "x-forwarded-for": "  203.0.113.7 " }))).toBe("203.0.113.7");
  });

  it("фоллбэк на x-real-ip", () => {
    expect(getClientIp(h({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("x-forwarded-for имеет приоритет над x-real-ip", () => {
    expect(getClientIp(h({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.4" }))).toBe("203.0.113.7");
  });

  it("возвращает unknown без заголовков", () => {
    expect(getClientIp(h({}))).toBe("unknown");
  });

  it("игнорирует пустой/мусорный x-forwarded-for", () => {
    expect(getClientIp(h({ "x-forwarded-for": "   ", "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(getClientIp(h({ "x-forwarded-for": "not an ip", "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("принимает IPv6", () => {
    expect(getClientIp(h({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });
});
```

- [ ] **Step 4: Запустить — убедиться, что падает**

Run: `pnpm vitest run packages/ratelimit`
Expected: FAIL — модуль `../client-ip` не существует.

- [ ] **Step 5: Реализовать getClientIp**

`packages/ratelimit/src/client-ip.ts`:

```ts
// Минимальная валидация IP: IPv4 (a.b.c.d) или содержит ':' (IPv6).
function isIpLike(value: string): boolean {
  if (!value) return false;
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) return true;
  if (value.includes(":") && /^[0-9a-fA-F:.]+$/.test(value)) return true;
  return false;
}

/**
 * Реальный IP клиента за Traefik. x-forwarded-for содержит цепочку
 * "client, proxy1, ..." — клиент идёт первым. Источник истины для ключей
 * rate-limit; в dev без прокси вернёт "unknown" — допустимо.
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim() ?? "";
    if (isIpLike(first)) return first;
  }
  const real = headers.get("x-real-ip")?.trim() ?? "";
  if (isIpLike(real)) return real;
  return "unknown";
}
```

- [ ] **Step 6: Создать index.ts**

`packages/ratelimit/src/index.ts`:

```ts
export { getClientIp } from "./client-ip";
```

- [ ] **Step 7: Запустить тесты**

Run: `pnpm vitest run packages/ratelimit`
Expected: PASS (8 кейсов).

- [ ] **Step 8: Commit**

```bash
git add packages/ratelimit pnpm-lock.yaml
git commit -m "feat(ratelimit): пакет @zhk/ratelimit + getClientIp (#59)"
```
Трейлер через пустую строку.

---

### Task 3: Конфиг лимитов (scopes + env override) (TDD)

**Files:**
- Create: `packages/ratelimit/src/config.ts`
- Modify: `packages/ratelimit/src/index.ts`
- Test: `packages/ratelimit/src/__tests__/config.test.ts`

- [ ] **Step 1: Написать падающий тест**

`packages/ratelimit/src/__tests__/config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RATE_LIMIT_DEFAULTS, resolveRateLimitConfig } from "../config";
import type { RateLimitScope } from "../config";

describe("RATE_LIMIT_DEFAULTS", () => {
  it("содержит все scopes с failMode", () => {
    const scopes: RateLimitScope[] = [
      "authSignIn", "siteUnlock", "ticketCreate", "ticketCreateHourly",
      "contactsGetByIds", "publicRead", "honoCeiling",
    ];
    for (const s of scopes) {
      expect(RATE_LIMIT_DEFAULTS[s]).toBeDefined();
      expect(RATE_LIMIT_DEFAULTS[s].points).toBeGreaterThan(0);
      expect(RATE_LIMIT_DEFAULTS[s].duration).toBeGreaterThan(0);
      expect(["open", "closed"]).toContain(RATE_LIMIT_DEFAULTS[s].failMode);
    }
  });

  it("критичные scopes — failMode closed", () => {
    expect(RATE_LIMIT_DEFAULTS.authSignIn.failMode).toBe("closed");
    expect(RATE_LIMIT_DEFAULTS.siteUnlock.failMode).toBe("closed");
    expect(RATE_LIMIT_DEFAULTS.ticketCreate.failMode).toBe("closed");
    expect(RATE_LIMIT_DEFAULTS.publicRead.failMode).toBe("open");
  });
});

describe("resolveRateLimitConfig", () => {
  it("без env-оверрайдов отдаёт дефолты", () => {
    const cfg = resolveRateLimitConfig("ticketCreate", {});
    expect(cfg.points).toBe(RATE_LIMIT_DEFAULTS.ticketCreate.points);
    expect(cfg.duration).toBe(RATE_LIMIT_DEFAULTS.ticketCreate.duration);
  });

  it("env-оверрайд points/duration применяется", () => {
    const cfg = resolveRateLimitConfig("ticketCreate", {
      RL_TICKET_CREATE_POINTS: 99,
      RL_TICKET_CREATE_DURATION: 111,
    });
    expect(cfg.points).toBe(99);
    expect(cfg.duration).toBe(111);
    expect(cfg.failMode).toBe("closed"); // failMode не оверрайдится
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm vitest run packages/ratelimit`
Expected: FAIL — `../config` не существует.

- [ ] **Step 3: Реализовать config.ts**

`packages/ratelimit/src/config.ts`:

```ts
export type FailMode = "open" | "closed";

export interface ScopeConfig {
  points: number;
  duration: number; // секунды
  blockDuration?: number; // секунды
  failMode: FailMode;
}

export type RateLimitScope =
  | "authSignIn"
  | "siteUnlock"
  | "ticketCreate"
  | "ticketCreateHourly"
  | "contactsGetByIds"
  | "publicRead"
  | "honoCeiling";

export const RATE_LIMIT_DEFAULTS: Record<RateLimitScope, ScopeConfig> = {
  authSignIn: { points: 5, duration: 900, blockDuration: 900, failMode: "closed" },
  siteUnlock: { points: 5, duration: 600, blockDuration: 600, failMode: "closed" },
  ticketCreate: { points: 5, duration: 600, blockDuration: 600, failMode: "closed" },
  ticketCreateHourly: { points: 20, duration: 3600, failMode: "closed" },
  contactsGetByIds: { points: 30, duration: 60, failMode: "open" },
  publicRead: { points: 120, duration: 60, failMode: "open" },
  honoCeiling: { points: 300, duration: 60, failMode: "open" },
};

/** Маппинг scope → имена env-оверрайдов (points/duration). */
const ENV_KEYS: Partial<Record<RateLimitScope, { points?: string; duration?: string }>> = {
  authSignIn: { points: "RL_AUTH_SIGNIN_POINTS", duration: "RL_AUTH_SIGNIN_DURATION" },
  siteUnlock: { points: "RL_SITE_UNLOCK_POINTS", duration: "RL_SITE_UNLOCK_DURATION" },
  ticketCreate: { points: "RL_TICKET_CREATE_POINTS", duration: "RL_TICKET_CREATE_DURATION" },
  ticketCreateHourly: { points: "RL_TICKET_HOURLY_POINTS" },
  contactsGetByIds: { points: "RL_CONTACTS_GETBYIDS_POINTS" },
  publicRead: { points: "RL_PUBLIC_READ_POINTS" },
  honoCeiling: { points: "RL_HONO_CEILING_POINTS" },
};

/**
 * Итоговый конфиг scope с учётом env-оверрайдов. envBag — объект env
 * (в проде передаётся `env` из @zhk/env/server; в тестах — литерал).
 */
export function resolveRateLimitConfig(
  scope: RateLimitScope,
  envBag: Record<string, unknown>,
): ScopeConfig {
  const base = RATE_LIMIT_DEFAULTS[scope];
  const keys = ENV_KEYS[scope] ?? {};
  const points = keys.points && typeof envBag[keys.points] === "number"
    ? (envBag[keys.points] as number)
    : base.points;
  const duration = keys.duration && typeof envBag[keys.duration] === "number"
    ? (envBag[keys.duration] as number)
    : base.duration;
  return { ...base, points, duration };
}
```

- [ ] **Step 4: Реэкспорт**

В `packages/ratelimit/src/index.ts` добавь:

```ts
export * from "./config";
```

- [ ] **Step 5: Запустить тесты**

Run: `pnpm vitest run packages/ratelimit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ratelimit
git commit -m "feat(ratelimit): конфиг scopes с env-оверрайдами (#59)"
```
Трейлер через пустую строку.

---

### Task 4: Лимитер (createLimiter, consume, Redis singleton) (TDD)

**Files:**
- Create: `packages/ratelimit/src/redis.ts`
- Create: `packages/ratelimit/src/limiter.ts`
- Modify: `packages/ratelimit/src/index.ts`
- Test: `packages/ratelimit/src/__tests__/limiter.test.ts`

- [ ] **Step 1: Написать падающий тест (на in-memory лимитере, без Redis)**

`packages/ratelimit/src/__tests__/limiter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { consume } from "../limiter";

function memLimiter(points: number, duration: number) {
  return new RateLimiterMemory({ points, duration });
}

describe("consume", () => {
  it("разрешает до лимита, отклоняет после", async () => {
    const limiter = memLimiter(2, 60);
    const key = "ip:1.1.1.1";

    const a = await consume(limiter, key, "open");
    expect(a.allowed).toBe(true);
    expect(a.remaining).toBe(1);

    const b = await consume(limiter, key, "open");
    expect(b.allowed).toBe(true);
    expect(b.remaining).toBe(0);

    const c = await consume(limiter, key, "open");
    expect(c.allowed).toBe(false);
    expect(c.retryAfterSec).toBeGreaterThan(0);
    expect(c.limit).toBe(2);
  });

  it("разные ключи не мешают друг другу", async () => {
    const limiter = memLimiter(1, 60);
    expect((await consume(limiter, "ip:a", "open")).allowed).toBe(true);
    expect((await consume(limiter, "ip:b", "open")).allowed).toBe(true);
    expect((await consume(limiter, "ip:a", "open")).allowed).toBe(false);
  });

  it("при ошибке лимитера failMode=open → allowed:true", async () => {
    const broken = { consume: () => Promise.reject(new Error("redis down")) } as never;
    const res = await consume(broken, "k", "open");
    expect(res.allowed).toBe(true);
  });

  it("при ошибке лимитера failMode=closed → allowed:false", async () => {
    const broken = { consume: () => Promise.reject(new Error("redis down")) } as never;
    const res = await consume(broken, "k", "closed");
    expect(res.allowed).toBe(false);
  });
});
```

Важно: rate-limiter-flexible при превышении лимита **реджектит** `RateLimiterRes` (не Error). При сбое стораджа реджектит `Error`. `consume` должен различать их.

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm vitest run packages/ratelimit`
Expected: FAIL — `../limiter` не существует.

- [ ] **Step 3: Реализовать redis.ts**

`packages/ratelimit/src/redis.ts`:

```ts
import Redis from "ioredis";
import { env } from "@zhk/env/server";

let client: Redis | null = null;

/** Singleton ioredis. lazyConnect — не падаем на старте, если Redis недоступен. */
export function getRedis(): Redis {
  if (client) return client;
  client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
  client.on("error", (err: Error) => {
    console.error("[ratelimit] redis error:", err.message);
  });
  return client;
}
```

- [ ] **Step 4: Реализовать limiter.ts**

`packages/ratelimit/src/limiter.ts`:

```ts
import {
  RateLimiterMemory,
  RateLimiterRedis,
  RateLimiterRes,
  type RateLimiterAbstract,
} from "rate-limiter-flexible";
import { getRedis } from "./redis";
import { resolveRateLimitConfig, type RateLimitScope } from "./config";

export interface RateDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  limit: number;
  resetAtMs: number;
}

/**
 * Лимитер для scope. failMode зашит в конструкцию:
 * - open: insuranceLimiter = RateLimiterMemory (fail-open при сбое Redis);
 * - closed: без insurance (consume вернёт allowed:false при сбое Redis).
 */
export function createLimiter(
  scope: RateLimitScope,
  envBag: Record<string, unknown>,
): RateLimiterAbstract {
  const cfg = resolveRateLimitConfig(scope, envBag);
  const base = {
    keyPrefix: `rl:${scope}`,
    points: cfg.points,
    duration: cfg.duration,
    ...(cfg.blockDuration ? { blockDuration: cfg.blockDuration } : {}),
  };
  const insuranceLimiter =
    cfg.failMode === "open"
      ? new RateLimiterMemory({ points: cfg.points, duration: cfg.duration })
      : undefined;
  return new RateLimiterRedis({
    storeClient: getRedis(),
    ...base,
    ...(insuranceLimiter ? { insuranceLimiter } : {}),
  });
}

/**
 * Списать 1 поинт по ключу. Различает превышение лимита (RateLimiterRes)
 * и сбой стораджа (Error): на сбой решение зависит от failMode.
 */
export async function consume(
  limiter: RateLimiterAbstract,
  key: string,
  failMode: "open" | "closed",
): Promise<RateDecision> {
  try {
    const res = await limiter.consume(key, 1);
    return {
      allowed: true,
      remaining: res.remainingPoints,
      retryAfterSec: 0,
      limit: res.remainingPoints + res.consumedPoints,
      resetAtMs: Date.now() + res.msBeforeNext,
    };
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: Math.ceil(err.msBeforeNext / 1000),
        limit: err.consumedPoints,
        resetAtMs: Date.now() + err.msBeforeNext,
      };
    }
    // Сбой стораджа (Redis down и нет insurance) → решает failMode.
    return {
      allowed: failMode === "open",
      remaining: failMode === "open" ? 1 : 0,
      retryAfterSec: failMode === "open" ? 0 : 60,
      limit: 0,
      resetAtMs: Date.now(),
    };
  }
}
```

- [ ] **Step 5: Реэкспорт**

В `packages/ratelimit/src/index.ts`:

```ts
export * from "./limiter";
export { getRedis } from "./redis";
```

- [ ] **Step 6: Запустить тесты**

Run: `pnpm vitest run packages/ratelimit`
Expected: PASS (все client-ip + config + limiter).

- [ ] **Step 7: Commit**

```bash
git add packages/ratelimit
git commit -m "feat(ratelimit): createLimiter + consume с fail-open/closed (#59)"
```
Трейлер через пустую строку.

---

### Task 5: clientIp в контексте oRPC

**Files:**
- Modify: `packages/api/src/context.ts`
- Modify: `packages/api/package.json` (добавить `@zhk/ratelimit`)

- [ ] **Step 1: Добавить зависимость**

В `packages/api/package.json` в `dependencies` добавь:

```json
    "@zhk/ratelimit": "workspace:*",
```

Run: `pnpm install`

- [ ] **Step 2: Извлечь clientIp в createContext**

В `packages/api/src/context.ts`:

Импорт сверху:
```ts
import { getClientIp } from "@zhk/ratelimit";
```

В `createContext`, после `const cookieHeader = ...`:
```ts
  const clientIp = getClientIp(context.req.raw.headers);
```

В возвращаемый объект добавь `clientIp`:
```ts
  return {
    session,
    siteId: site?.id ?? null,
    site,
    cookieHeader,
    clientIp,
    responseHeaders,
  };
```

- [ ] **Step 3: Проверить типы**

Run: `pnpm check-types`
Expected: без новых ошибок (тип `Context` теперь содержит `clientIp: string`).

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/context.ts packages/api/package.json pnpm-lock.yaml
git commit -m "feat(api): clientIp в oRPC-контексте (#59)"
```
Трейлер через пустую строку.

---

### Task 6: oRPC middleware-фабрика rateLimit (TDD)

**Files:**
- Create: `packages/api/src/middleware/rate-limit.ts`
- Test: `packages/api/src/middleware/__tests__/rate-limit.test.ts`

- [ ] **Step 1: Написать падающий тест**

`packages/api/src/middleware/__tests__/rate-limit.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { buildRateLimitKey } from "../rate-limit";

describe("buildRateLimitKey", () => {
  const ctx = { clientIp: "1.2.3.4", siteId: "site-9" };

  it("keyBy ip", () => {
    expect(buildRateLimitKey("ip", ctx, undefined)).toBe("1.2.3.4");
  });

  it("keyBy ip+site", () => {
    expect(buildRateLimitKey("ip+site", ctx, undefined)).toBe("1.2.3.4|site-9");
  });

  it("keyBy ip+site без siteId использует none", () => {
    expect(buildRateLimitKey("ip+site", { clientIp: "1.2.3.4", siteId: null }, undefined)).toBe("1.2.3.4|none");
  });

  it("keyBy ip+extra добавляет нормализованное значение", () => {
    expect(buildRateLimitKey("ip+extra", ctx, "+7 (999) 123-45-67")).toBe("1.2.3.4|79991234567");
  });

  it("keyBy ip+extra без значения → ip|none", () => {
    expect(buildRateLimitKey("ip+extra", ctx, undefined)).toBe("1.2.3.4|none");
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm vitest run packages/api/src/middleware`
Expected: FAIL — `../rate-limit` не существует.

- [ ] **Step 3: Реализовать middleware**

`packages/api/src/middleware/rate-limit.ts`:

```ts
import { ORPCError } from "@orpc/server";
import { env } from "@zhk/env/server";
import {
  consume,
  createLimiter,
  type RateLimitScope,
} from "@zhk/ratelimit";
import { o } from "../index";

type KeyBy = "ip" | "ip+site" | "ip+extra";

interface KeyableContext {
  clientIp: string;
  siteId: string | null;
}

/** Только цифры — для дедупликации телефона/похожих значений в ключе. */
function normalizeExtra(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits || "none";
}

export function buildRateLimitKey(
  keyBy: KeyBy,
  ctx: KeyableContext,
  extra: string | undefined,
): string {
  if (keyBy === "ip") return ctx.clientIp;
  if (keyBy === "ip+site") return `${ctx.clientIp}|${ctx.siteId ?? "none"}`;
  return `${ctx.clientIp}|${extra ? normalizeExtra(extra) : "none"}`;
}

// Лимитеры создаются лениво и кешируются по scope (один на процесс).
const limiterCache = new Map<RateLimitScope, ReturnType<typeof createLimiter>>();
function limiterFor(scope: RateLimitScope) {
  let l = limiterCache.get(scope);
  if (!l) {
    l = createLimiter(scope, env as unknown as Record<string, unknown>);
    limiterCache.set(scope, l);
  }
  return l;
}

interface RateLimitOpts {
  keyBy?: KeyBy;
  /** Для keyBy "ip+extra": достаёт значение из input. */
  extractExtra?: (input: unknown) => string | undefined;
  failMode?: "open" | "closed";
}

/**
 * oRPC middleware: списывает поинт scope по ключу из контекста/инпута.
 * При превышении бросает TOO_MANY_REQUESTS и кладёт Retry-After/RateLimit-*
 * в responseHeaders. RL_ENABLED=false полностью отключает (для тестов/локали).
 */
export function rateLimit(scope: RateLimitScope, opts: RateLimitOpts = {}) {
  const keyBy = opts.keyBy ?? "ip";
  const failMode = opts.failMode ?? "open";

  return o.middleware(async ({ context, next }, input) => {
    if (!env.RL_ENABLED) return next({ context });

    const ctx = context as unknown as KeyableContext & {
      responseHeaders: Headers;
    };
    const extra = opts.extractExtra ? opts.extractExtra(input) : undefined;
    const key = buildRateLimitKey(keyBy, ctx, extra);
    const decision = await consume(limiterFor(scope), `${key}`, failMode);

    ctx.responseHeaders.set("RateLimit-Limit", String(decision.limit));
    ctx.responseHeaders.set("RateLimit-Remaining", String(decision.remaining));
    ctx.responseHeaders.set("RateLimit-Reset", String(Math.ceil(decision.resetAtMs / 1000)));

    if (!decision.allowed) {
      ctx.responseHeaders.set("Retry-After", String(decision.retryAfterSec));
      throw new ORPCError("TOO_MANY_REQUESTS", {
        message: "Слишком много запросов. Повторите позже.",
        data: { retryAfterSec: decision.retryAfterSec },
      });
    }

    return next({ context });
  });
}
```

Примечание: oRPC middleware получает `input` вторым аргументом — проверь сигнатуру `o.middleware` в установленной версии @orpc/server (в `packages/api/src/index.ts` middleware используют только `{ context, next }`; input доступен как второй параметр в актуальном API). Если сигнатура иная — достань input через доступный механизм (например, `next` после валидации или `.use` с типизацией); цель — `extractExtra(input)` для телефона. Если input недоступен в middleware на текущей версии, для `ip+extra` примени лимит **внутри хендлера** tickets.create (вызвав `consume` напрямую) — отметь это отклонение в отчёте.

- [ ] **Step 4: Запустить тесты**

Run: `pnpm vitest run packages/api/src/middleware`
Expected: PASS (buildRateLimitKey).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/middleware
git commit -m "feat(api): oRPC middleware rateLimit + buildRateLimitKey (#59)"
```
Трейлер через пустую строку.

---

### Task 7: Применить лимит к tickets.create + нормализация телефона

**Files:**
- Modify: `packages/api/src/routers/public/tickets.ts`

- [ ] **Step 1: Навесить два лимитера на процедуру**

В `packages/api/src/routers/public/tickets.ts`:

Импорт:
```ts
import { rateLimit } from "../../middleware/rate-limit";
```

Замени `create: publicActiveSiteProcedure` на цепочку с лимитами (бёрст + часовой, оба keyBy `ip+extra` по телефону):

```ts
  create: publicActiveSiteProcedure
    .use(rateLimit("ticketCreate", {
      keyBy: "ip+extra",
      failMode: "closed",
      extractExtra: (input) => (input as { phone?: string })?.phone,
    }))
    .use(rateLimit("ticketCreateHourly", {
      keyBy: "ip+extra",
      failMode: "closed",
      extractExtra: (input) => (input as { phone?: string })?.phone,
    }))
    .input(
```

(остальной .input/.handler без изменений)

- [ ] **Step 2: Проверить типы**

Run: `pnpm check-types`
Expected: без новых ошибок.

- [ ] **Step 3: Ручная проверка логики (без Redis-теста)**

Прочитай результат: при превышении 5 запросов с одного IP+телефона за 10 мин — `TOO_MANY_REQUESTS`, БД и Telegram не вызываются (middleware бросает до хендлера).

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routers/public/tickets.ts
git commit -m "feat(api): rate-limit на tickets.create (бёрст + часовой) (#59)"
```
Трейлер через пустую строку.

---

### Task 8: Лимит на site.unlock, contacts.getByIds (+max 100), publicRead на READ

**Files:**
- Modify: `packages/api/src/routers/public/site.ts`
- Modify: `packages/api/src/routers/public/contacts.ts`
- Modify: `packages/api/src/index.ts` (новая `publicReadProcedure`)
- Modify: READ-роутеры (projects/news/pages/documents/promotions/mortgage-programs/purchase-methods/construction-progress — `.list` хендлеры)

- [ ] **Step 1: Лимит на site.unlock**

В `packages/api/src/routers/public/site.ts`:

Импорт:
```ts
import { rateLimit } from "../../middleware/rate-limit";
```

Замени `unlock: publicSiteProcedure` на:
```ts
  unlock: publicSiteProcedure
    .use(rateLimit("siteUnlock", { keyBy: "ip+site", failMode: "closed" }))
    .input(z.object({ password: z.string().min(1) }))
```

- [ ] **Step 2: max 100 + лимит на contacts.getByIds**

В `packages/api/src/routers/public/contacts.ts`:

Импорт:
```ts
import { rateLimit } from "../../middleware/rate-limit";
```

Замени `getByIds: publicActiveSiteProcedure` блок на:
```ts
  getByIds: publicActiveSiteProcedure
    .use(rateLimit("contactsGetByIds", { keyBy: "ip", failMode: "open" }))
    .input(z.object({ ids: z.array(z.string()).max(100) }))
```
(остальной .handler без изменений)

- [ ] **Step 3: Ввести publicReadProcedure**

В `packages/api/src/index.ts` после строки `export const publicActiveSiteProcedure = ...` добавь:

```ts
import { rateLimit } from "./middleware/rate-limit";

export const publicReadProcedure = publicActiveSiteProcedure.use(
  rateLimit("publicRead", { keyBy: "ip", failMode: "open" }),
);
```

ВНИМАНИЕ на циклический импорт: `middleware/rate-limit.ts` импортирует `o` из `index.ts`. Чтобы разорвать цикл — вынеси базовый `o` и `publicProcedure` в отдельный файл `packages/api/src/orpc-base.ts`:
```ts
import { os } from "@orpc/server";
import type { Context } from "./context";
export const o = os.$context<Context>();
export const publicProcedure = o;
```
В `index.ts` импортируй `o`, `publicProcedure` оттуда (`export { o, publicProcedure } from "./orpc-base";`), и в `middleware/rate-limit.ts` импортируй `o` из `../orpc-base` вместо `../index`. Проверь, что все потребители `o`/`publicProcedure` продолжают работать.

- [ ] **Step 4: Применить publicReadProcedure к READ-хендлерам**

В каждом из роутеров `routers/public/{projects,news,pages,documents,promotions,mortgage-programs,purchase-methods,construction-progress}.ts` замени в `.list` (и `.getBySlug`, где есть) `publicActiveSiteProcedure` → `publicReadProcedure`. Импорт `publicReadProcedure` из `"../../index"`. НЕ трогай `contacts`/`tickets`/`site` (у них свои лимиты), `homepage.get`, `modals.getBySlug` (низкий риск — по желанию можно тоже publicRead, но не обязательно).

- [ ] **Step 5: Проверить типы и тесты**

Run: `pnpm check-types && pnpm vitest run`
Expected: без новых ошибок; тесты PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/
git commit -m "feat(api): лимиты site.unlock, contacts.getByIds (+max100), publicRead на READ (#59)"
```
Трейлер через пустую строку.

---

### Task 9: better-auth rateLimit + Redis secondaryStorage

**Files:**
- Modify: `packages/auth/package.json` (добавить `@zhk/ratelimit`)
- Modify: `packages/auth/src/index.ts`

- [ ] **Step 1: Добавить зависимость**

В `packages/auth/package.json` в `dependencies`:
```json
    "@zhk/ratelimit": "workspace:*",
```
Run: `pnpm install`

- [ ] **Step 2: Включить rateLimit и secondaryStorage**

В `packages/auth/src/index.ts`:

Импорт:
```ts
import { getRedis } from "@zhk/ratelimit";
```

Перед `export const auth = betterAuth({` добавь адаптер хранилища:
```ts
const redis = getRedis();

const secondaryStorage = {
  get: async (key: string) => (await redis.get(key)) ?? null,
  set: async (key: string, value: string, ttl?: number) => {
    if (ttl) await redis.set(key, value, "EX", ttl);
    else await redis.set(key, value);
  },
  delete: async (key: string) => {
    await redis.del(key);
  },
};
```

В объект `betterAuth({...})` добавь поля (после `plugins`):
```ts
  secondaryStorage,
  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
    window: 900,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 900, max: 5 },
    },
  },
  advanced: {
    ...{ /* существующий defaultCookieAttributes блок сохранить */ },
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
```
ВАЖНО: `advanced` уже существует с `defaultCookieAttributes` — НЕ перезаписывай его, добавь `ipAddress` внутрь существующего `advanced`. Сверь точную форму `rateLimit`/`secondaryStorage`/`ipAddress` с актуальной версией better-auth (см. установленную версию в node_modules или docs через context7 mcp), поправь имена полей при расхождении.

- [ ] **Step 3: Проверить типы**

Run: `pnpm check-types`
Expected: без новых ошибок.

- [ ] **Step 4: Commit**

```bash
git add packages/auth/ pnpm-lock.yaml
git commit -m "feat(auth): better-auth rateLimit на Redis + IP за прокси (#59)"
```
Трейлер через пустую строку.

---

### Task 10: Hono global ceiling middleware

**Files:**
- Create: `apps/server/src/middleware/rate-limit.ts`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/package.json` (добавить `@zhk/ratelimit`, если ещё нет)

- [ ] **Step 1: Добавить зависимость**

Проверь `apps/server/package.json` — есть ли `@zhk/ratelimit`. Если нет, добавь `"@zhk/ratelimit": "workspace:*"` в dependencies и `pnpm install`.

- [ ] **Step 2: Hono-middleware**

`apps/server/src/middleware/rate-limit.ts`:

```ts
import type { Context, Next } from "hono";
import { env } from "@zhk/env/server";
import { consume, createLimiter, getClientIp } from "@zhk/ratelimit";

const ceiling = createLimiter("honoCeiling", env as unknown as Record<string, unknown>);

/** Грубый per-IP потолок против флуда любого маршрута. fail-open. */
export async function rateLimitCeiling(c: Context, next: Next) {
  if (!env.RL_ENABLED) return next();
  const ip = getClientIp(c.req.raw.headers);
  const decision = await consume(ceiling, ip, "open");
  if (!decision.allowed) {
    c.header("Retry-After", String(decision.retryAfterSec));
    return c.json({ error: "Too many requests" }, 429);
  }
  return next();
}
```

- [ ] **Step 3: Подключить в Hono**

В `apps/server/src/index.ts` импорт:
```ts
import { rateLimitCeiling } from "./middleware/rate-limit";
```

После `app.use(logger());` и блока `cors(...)`, ПЕРЕД `app.on(["POST","GET"], "/api/auth/*", ...)` добавь:
```ts
app.use("/*", rateLimitCeiling);
```
(потолок применяется ко всем маршрутам, включая auth и rpc).

- [ ] **Step 4: Проверить типы и запуск**

Run: `pnpm check-types`
Expected: без новых ошибок.

- [ ] **Step 5: Commit**

```bash
git add apps/server/ pnpm-lock.yaml
git commit -m "feat(server): Hono per-IP ceiling middleware (#59)"
```
Трейлер через пустую строку.

---

### Task 11: Web — обработка 429 на формах

**Files:**
- Modify: `apps/web/app/components/ModalProvider.vue`
- Modify: `apps/web/app/components/SitePasswordGate.vue`
- Modify: `apps/web/server/api/site/unlock.post.ts`

- [ ] **Step 1: 429 в ModalProvider (форма заявки)**

В `apps/web/app/components/ModalProvider.vue` в `catch (err)` блоке `handleSubmit` (сейчас просто `console.error` + `submitState = "idle"`) добавь распознавание 429. oRPC-ошибка имеет `code`/`status`. Замени catch на:

```ts
  } catch (err) {
    console.error("[modal] submit failed", err);
    submitState.value = "idle";
    const e = err as { status?: number; code?: string; data?: { retryAfterSec?: number } };
    if (e?.status === 429 || e?.code === "TOO_MANY_REQUESTS") {
      const sec = e?.data?.retryAfterSec ?? 60;
      submitError.value = `Слишком много попыток. Повторите через ${sec} сек.`;
    }
  }
```
Если в компоненте нет `submitError` ref — добавь `const submitError = ref<string | null>(null)` рядом с `submitState` и отрендери его текстом под кнопкой (`<p v-if="submitError" class="...">{{ submitError }}</p>`); сбрасывай в начале `handleSubmit` (`submitError.value = null`). Сверь точные имена ref-ов с фактическим кодом компонента.

- [ ] **Step 2: 429 в unlock.post.ts (проброс статуса)**

В `apps/web/server/api/site/unlock.post.ts` сейчас форвардит на `/rpc/public/site/unlock` и обрабатывает ответ. Убедись, что при 429 от сервера статус и тело пробрасываются наверх (а не маппятся в дефолтную ошибку). Прочитай файл; если он глотает не-2xx как generic-ошибку — добавь ветку: при `res.status === 429` верни `setResponseStatus(event, 429)` и тело с `retryAfterSec` (или проброс заголовка `Retry-After`). Точную форму подгони под текущую реализацию хендлера.

- [ ] **Step 3: 429 в SitePasswordGate**

В `apps/web/app/components/SitePasswordGate.vue` в обработчике submit (вызывает `$fetch("/api/site/unlock")`) добавь catch на 429: показать «Слишком много попыток, повторите через N сек» вместо общей ошибки неверного пароля. Сверь с текущим кодом обработки ошибок компонента.

- [ ] **Step 4: Проверка**

Run: `pnpm vitest run`
Expected: PASS (web-компоненты не покрыты unit-тестами — проверка не должна сломаться). Vite-transform трёх файлов на dev-сервере (если запущен) → 200.

- [ ] **Step 5: Commit**

```bash
git add apps/web/
git commit -m "feat(web): обработка 429 на формах заявки и разблокировки (#59)"
```
Трейлер через пустую строку.

---

### Task 12: Документация + финальная верификация

**Files:**
- Create: `docs/rate-limiting.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: docs/rate-limiting.md**

Напиши руководство (по образцу docs/tracking.md): архитектура трёх уровней, пакет `@zhk/ratelimit` (getClientIp, createLimiter, consume, config), таблица scopes с дефолтами и failMode, env-оверрайды `RL_*` и `REDIS_URL`, как добавить лимит на новую процедуру (`.use(rateLimit(scope, opts))`), fail-open/closed семантика, локальный Redis (docker-compose), поведение 429 на web. Сверяй каждое утверждение с кодом.

**ОБЯЗАТЕЛЬНО** включи раздел «Требование к reverse-proxy (Traefik)»: вся
схема ключей опирается на то, что Traefik **перезаписывает** `x-forwarded-for`
реальным IP клиента, а не аппендит к клиентскому значению. Если прокси доверяет
входящему XFF — клиент спуфит IP заголовком и обходит лимит. Перед прод-деплоем
проверить конфиг Traefik (`forwardedHeaders.trustedIPs` = только адреса
LB/прокси; не `insecure: true`). Это поднял quality-ревью Task 2.

- [ ] **Step 2: CLAUDE.md**

Добавь раздел «Rate limiting» со ссылкой на docs/rate-limiting.md и краткой памяткой: горячие ручки защищены через `.use(rateLimit(...))`, движок — `@zhk/ratelimit` на Redis, env `RL_*`.

- [ ] **Step 3: Полный прогон**

Run: `pnpm vitest run && pnpm check-types`
Expected: все тесты PASS; check-types без новых ошибок против базлайна.

- [ ] **Step 4: Ручная интеграционная проверка с Redis (если возможно)**

Запусти Redis (`docker compose up redis -d` или через `turbo db:start`, если Redis добавлен туда) и сервер (`pnpm dev:server`). Проверь:
- `for i in $(seq 1 7); do curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/sign-in/email -H 'content-type: application/json' -d '{"email":"x@x.com","password":"wrong"}'; done` — после 5 попыток статус 429.
- Аналогично можно проверить ceiling, послав >300 запросов на `/`.
Если Redis/сервер поднять нельзя — отметь в отчёте, что интеграционная проверка за пользователем.

- [ ] **Step 5: Commit**

```bash
git add docs/rate-limiting.md CLAUDE.md
git commit -m "docs: руководство по rate limiting (#59)"
```
Трейлер через пустую строку.

- [ ] **Step 6: Комментарий в issue**

```bash
gh issue comment 59 --body "Реализация по плану docs/superpowers/plans/2026-06-12-rate-limiting.md завершена: @zhk/ratelimit (Redis + in-memory fallback), oRPC middleware на горячих ручках (tickets/site.unlock/contacts/READ), better-auth rateLimit, Hono-потолок, обработка 429 на web, env-оверрайды RL_*."
```

---

## Self-Review (выполнено автором плана)

**Spec coverage:** §1 packages/ratelimit → Tasks 2–4; §2 конфиг → Task 3; §3 oRPC middleware → Task 6, применение → Tasks 7–8; §4 better-auth → Task 9; §5 Hono ceiling → Task 10; §6 укрепление (contacts max100, норм телефона) → Tasks 7–8; поток данных → Tasks 7; fail-mode → Task 4; web 429 → Task 11; инфра Redis/env → Task 1; тесты → Tasks 2–6; clientIp в контексте (не было явной секции, но необходимо) → Task 5. Покрыто.

**Известные риски, отмеченные в задачах:** (а) сигнатура `o.middleware` с `input` — Task 6 содержит фоллбэк; (б) циклический импорт middleware↔index — Task 8 Step 3 выносит `o` в `orpc-base.ts`; (в) точные имена полей better-auth `rateLimit`/`secondaryStorage`/`ipAddress` — Task 9 требует сверки с версией; (г) ref-имена в web-компонентах — Tasks 11 требуют сверки с кодом.
