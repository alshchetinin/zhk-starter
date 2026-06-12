# Rate limiting

Защита горячих ручек от перебора, флуда и злоупотреблений. Три независимых
уровня поверх одного Redis, единый движок `@zhk/ratelimit` и обработка `429`
на стороне веб-форм.

## Обзор

Зачем: публичные ручки (формы заявок, разблокировка сайта по паролю, выдача
контактов) и аутентификация уязвимы к перебору и спаму. Лимиты режут это по
IP-ключу.

Три уровня защиты — запрос проходит их по порядку:

| Уровень | Где | Что защищает |
|---|---|---|
| **1. Hono ceiling** | `apps/server/src/middleware/rate-limit.ts` | Грубый per-IP потолок на ВСЕ маршруты (300/60с, fail-open) — заслон от флуда |
| **2. better-auth** | `packages/auth/src/index.ts` | Эндпоинты аутентификации (`/sign-in/email` — 5/15мин) |
| **3. oRPC middleware** | `packages/api/src/middleware/rate-limit.ts` | Точечные лимиты на конкретные процедуры (формы, unlock, контакты, чтение) |

Все три уровня используют **один Redis** (`REDIS_URL`). Для счётчиков, где
доступность важнее точности (чтение), есть **in-memory insurance**
(`RateLimiterMemory`) — при сбое Redis запросы продолжают проходить, а лимит
держится локально в памяти процесса.

## Пакет `@zhk/ratelimit`

Движок. Не зависит от oRPC/Hono — переиспользуется во всех трёх уровнях.

| Экспорт | Файл | Назначение |
|---|---|---|
| `getClientIp(headers)` | `client-ip.ts` | Реальный IP клиента из `x-forwarded-for` (первый в цепочке) или `x-real-ip`. Нормализует ключ: разворачивает IPv4-mapped IPv6 (`::ffff:1.2.3.4` → `1.2.3.4`), стрипает порт. Без прокси вернёт `"unknown"`. |
| `createLimiter(scope, envBag)` | `limiter.ts` | `RateLimiterRedis` для scope. Для `failMode: "open"` добавляет `insuranceLimiter` (`RateLimiterMemory`); для `"closed"` — без insurance. |
| `consume(limiter, key, failMode)` | `limiter.ts` | Списывает 1 поинт. Возвращает `RateDecision` (см. ниже). Различает превышение лимита и сбой стораджа — на сбой решение зависит от `failMode`. |
| `getRedis()` | `redis.ts` | Singleton `ioredis`. Подключается сразу (без `lazyConnect`), `enableOfflineQueue: false`, `maxRetriesPerRequest: 1`. `REDIS_URL` читается из `process.env` напрямую. |
| `resolveRateLimitConfig`, `RATE_LIMIT_DEFAULTS`, `RateLimitScope` | `config.ts` | Конфиг scopes + применение env-оверрайдов. |

`RateDecision`:

```ts
interface RateDecision {
  allowed: boolean;       // true — поинт списан, пропускаем
  remaining: number;      // сколько поинтов осталось в окне
  retryAfterSec: number;  // через сколько секунд можно повторить (при !allowed)
  limit: number;          // полный лимит окна (0 = сбой стораджа, без реального лимита)
  resetAtMs: number;      // когда окно сбросится (Date.now()-based)
}
```

## Scopes

Источник правды — `RATE_LIMIT_DEFAULTS` в `packages/ratelimit/src/config.ts`.
Одна правка таблицы там → новый лимит везде, где scope применяется.

| Scope | Лимит (points / duration) | blockDuration | failMode | Где применяется |
|---|---|---|---|---|
| `authSignIn` | 5 / 900с | 900с | closed | Зарезервирован для auth (better-auth настраивает свой лимит sign-in отдельно, см. ниже) |
| `siteUnlock` | 5 / 600с | 600с | closed | `public.site.unlock` (`ip+site`) |
| `ticketCreate` | 5 / 600с | 600с | closed | `public.tickets.create` — два лимитера: `ip+site` и `ip+phone` (дедуп по телефону) |
| `ticketCreateHourly` | 20 / 3600с | — | closed | `public.tickets.create` (`ip+site`) — часовой потолок |
| `contactsGetByIds` | 30 / 60с | — | open | `public.contacts.getByIds` (`ip`) + `input.ids` ограничен `.max(100)` |
| `publicRead` | 120 / 60с | — | open | READ-процедуры (`list` / `getBySlug`) через `publicReadProcedure` в 8 роутерах (`ip`) |
| `honoCeiling` | 300 / 60с | — | open | Hono per-IP потолок на все маршруты |

> `blockDuration` (если задан) — после превышения клиент блокируется на это
> время, даже если окно `duration` уже прошло. Для closed-scope равен `duration`.

## Как добавить лимит на процедуру

oRPC middleware `rateLimit(scope, opts)`:

```ts
import { rateLimit } from "../../middleware/rate-limit";

export const myRouter = {
  unlock: publicActiveSiteProcedure
    .use(rateLimit("siteUnlock", { keyBy: "ip+site" }))
    .input(/* ... */)
    .handler(/* ... */),
};
```

`failMode` **не передаётся в opts** — он берётся из конфига scope
(`config.ts`). Это сделано намеренно: рассинхрон `failMode` с лимитером сломал
бы fail-closed (см. комментарий в `rate-limit.ts`).

`keyBy` — из чего собирается ключ лимита:

| `keyBy` | Ключ | Когда |
|---|---|---|
| `"ip"` (по умолчанию) | `clientIp` | Лимит на IP целиком |
| `"ip+site"` | `clientIp\|siteId` | Лимит на IP в пределах одного сайта (мультисайт) |
| `"ip+extra"` | `clientIp\|<extra>` | Лимит на IP + значение из input (`extractExtra`) |

`extractExtra` — функция, достающая значение из input для `keyBy: "ip+extra"`.
Перед использованием в ключе значение нормализуется (для телефона — только
цифры). Пример из `tickets.create` (дедуп по телефону):

```ts
.use(rateLimit("ticketCreate", {
  keyBy: "ip+extra",
  extractExtra: (input) => (input as { phone?: string })?.phone,
}))
```

На одну процедуру можно навесить несколько `.use(rateLimit(...))` с разными
scope/keyBy (как `tickets.create`: `ip+site` короткий + `ip+site` часовой +
`ip+phone`).

При превышении middleware бросает `ORPCError("TOO_MANY_REQUESTS")` с
`data.retryAfterSec` и выставляет заголовки (см. «429 на клиенте»).

`clientIp` и `siteId` приходят в oRPC-контексте из `createContext`
(`packages/api/src/context.ts` вызывает `getClientIp`).

## fail-open vs fail-closed

`failMode` определяет поведение **при сбое Redis** (down / недоступен):

- **fail-open** (`open`) — при сбое запрос **пропускается**. Для счётчиков, где
  доступность важнее строгости: чтение каталога, выдача контактов, грубый
  потолок. У таких scope есть `insuranceLimiter` (`RateLimiterMemory`) — лимит
  продолжает работать в памяти процесса, пока Redis недоступен. Scopes:
  `contactsGetByIds`, `publicRead`, `honoCeiling`.
- **fail-closed** (`closed`) — при сбое запрос **отклоняется** (`429`,
  `retryAfterSec: 60`). Для критичных по безопасности ручек: лучше отказать,
  чем дать перебор без счётчика. Scopes: `authSignIn`, `siteUnlock`,
  `ticketCreate`, `ticketCreateHourly`.

Механика `consume`: успех/превышение Redis возвращает `RateLimiterRes`; любой
другой throw трактуется как сбой стораджа → решение по `failMode`. Для
open-scope сбой обычно перехватывает insurance ещё внутри `RateLimiterRedis`,
и до этой ветки не доходит — она safety-net.

> **Исключение для локальной разработки.** fail-closed строг **только в проде**
> (`NODE_ENV=production`). Вне прода closed-scope при недоступном Redis тоже
> fail-open — иначе `pnpm dev` без Redis ломал бы вход и формы в `429`. Так
> локальная разработка работает из коробки (лимиты деградируют), а прод-сборка
> держит строгий fail-closed. Полный выключатель — `RL_ENABLED=false`.

> **better-auth не зависит от Redis.** Сессии хранятся в БД
> (`drizzleAdapter`), `secondaryStorage` НЕ подключается: при его наличии
> better-auth держал бы сессии в нём, и без Redis сессия терялась бы
> (`get → null`) — вход «проходит», но сразу разлогинивает. Auth rate-limit
> (`packages/auth/src/index.ts`) использует `storage: "memory"` —
> per-instance, без Redis. Для шаринга auth-лимита между инстансами в проде
> можно перейти на `storage: "database"` (нужна таблица `rateLimit` +
> миграция). oRPC/Hono-уровни лимитов по-прежнему на Redis.

## env

`packages/env/src/server.ts`:

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Адрес Redis для всех уровней |
| `RL_ENABLED` | `true` | Глобальный выключатель. `false` — middleware и Hono ceiling пропускают всё (для тестов/локалки) |

Оверрайды лимитов (все опциональные, целое положительное; не задан → дефолт из
`config.ts`):

| Переменная | Scope | Параметр |
|---|---|---|
| `RL_AUTH_SIGNIN_POINTS` / `RL_AUTH_SIGNIN_DURATION` | `authSignIn` | points / duration |
| `RL_SITE_UNLOCK_POINTS` / `RL_SITE_UNLOCK_DURATION` | `siteUnlock` | points / duration |
| `RL_TICKET_CREATE_POINTS` / `RL_TICKET_CREATE_DURATION` | `ticketCreate` | points / duration |
| `RL_TICKET_HOURLY_POINTS` | `ticketCreateHourly` | points |
| `RL_CONTACTS_GETBYIDS_POINTS` | `contactsGetByIds` | points |
| `RL_PUBLIC_READ_POINTS` | `publicRead` | points |
| `RL_HONO_CEILING_POINTS` | `honoCeiling` | points |

> `better-auth` лимит sign-in (5/15мин) задан в коде через `customRules` и **не
> читает** `RL_AUTH_SIGNIN_*` — это отдельная подсистема. `authSignIn` scope в
> `@zhk/ratelimit` зарезервирован под будущее использование.

## Локальный Redis

Redis-сервис описан в `packages/db/docker-compose.yml` (`redis:7-alpine`, порт
6379, без персистентности). Поднимается вместе с Postgres:

```bash
pnpm db:start                                   # turbo -F @zhk/db db:start (docker compose up -d)
# или только Redis:
docker compose -f packages/db/docker-compose.yml up redis -d
```

Проверка:

```bash
redis-cli -p 6379 ping        # PONG
# или
docker ps | grep redis
```

**Redis для локальной разработки не обязателен.** Без него `pnpm dev` работает:
open-scope лимиты держатся in-memory (insurance), closed-scope вне прода
fail-open (см. «fail-open vs fail-closed»), better-auth fail-soft. В консоли —
одно предупреждение `[ratelimit] redis недоступен …`. Поднимать Redis локально
стоит, только если нужно проверить реальное срабатывание лимитов (например, что
после N попыток приходит `429`). Полностью выключить лимиты — `RL_ENABLED=false`.

## 429 на клиенте

При превышении сервер отдаёт:

- **`Retry-After`** — секунды до следующей попытки.
- **`RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset`** — состояние
  окна (только при валидном лимите; при сбое стораджа `limit=0` и заголовки не
  ставятся, чтобы не вводить в заблуждение).
- В теле oRPC-ошибки — `data.retryAfterSec`.

Веб-формы показывают это пользователю:

- **`ModalProvider.vue`** (формы заявок) — в catch проверяет
  `status === 429 || code === "TOO_MANY_REQUESTS"`, берёт `data.retryAfterSec`
  (fallback 60) и пишет в `submitError`: «Слишком много попыток. Повторите
  через N сек.»
- **`SitePasswordGate.vue`** (разблокировка сайта) — ветка `statusCode === 429`,
  достаёт `retryAfterSec` (через `unlock.post.ts`, который пробрасывает его из
  oRPC-ошибки), тот же текст.

## Требование к reverse-proxy (Traefik)

**Критично для прода.** Вся схема ключей опирается на то, что reverse-proxy
(Traefik) **ПЕРЕЗАПИСЫВАЕТ** `x-forwarded-for` реальным IP клиента, а не
дописывает входящее значение клиента в начало цепочки.

`getClientIp` берёт **первый** IP из `x-forwarded-for`. Если прокси доверяет
входящему `x-forwarded-for` и аппендит к нему, клиент может прислать заголовок
`X-Forwarded-For: 1.2.3.4` и получать новый ключ лимита на каждый запрос —
**полный обход лимита спуфингом IP**.

Перед прод-деплоем проверить конфиг Traefik:

- `forwardedHeaders.trustedIPs` (на entrypoint) — **только** адреса самого
  LB/прокси перед Traefik. Тогда Traefik принимает `X-Forwarded-For` лишь от
  доверенных адресов, а от внешнего клиента — перезаписывает.
- **НЕ** использовать `forwardedHeaders.insecure: true` — это заставляет
  Traefik доверять любому входящему `X-Forwarded-For`.
- Если Traefik — единственный edge-прокси (клиенты ходят напрямую в него),
  `trustedIPs` оставить пустым/минимальным: Traefik сам поставит remote-addr
  как `X-Forwarded-For`, игнорируя клиентский.

`better-auth` тоже читает IP из `x-forwarded-for`
(`advanced.ipAddress.ipAddressHeaders = ["x-forwarded-for", "x-real-ip"]`),
поэтому требование к Traefik распространяется и на его лимит sign-in.

## better-auth rate-limit

Аутентификация лимитируется отдельной подсистемой better-auth
(`packages/auth/src/index.ts`) — **в памяти**, без Redis (сессии лежат в БД,
от Redis auth не зависит):

```ts
rateLimit: {
  enabled: true,
  storage: "memory",   // per-instance; для шаринга в проде — "database" (+миграция)
  window: 900,         // дефолт: 100 запросов / 15 мин на остальные auth-ручки
  max: 100,
  customRules: {
    "/sign-in/email": { window: 900, max: 5 },  // sign-in: 5 / 15 мин
  },
},
```

`secondaryStorage` сознательно НЕ подключается: better-auth держал бы в нём
сессии, и без Redis они терялись бы (вход «проходит» и сразу разлогинивает).

Проверка лимита sign-in (после `RL_ENABLED` + сервера; Redis не нужен):

```bash
for i in $(seq 1 7); do
  curl -s -o /dev/null -w "%{http_code} " \
    -X POST http://localhost:3000/api/auth/sign-in/email \
    -H 'content-type: application/json' \
    -d '{"email":"x@x.com","password":"wrong"}'
done; echo
# Ожидание: первые 5 → 401, затем 429.
```
