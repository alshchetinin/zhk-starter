# Rate limiting на формах и критических API

**Дата:** 2026-06-12
**Issue:** [#59](https://github.com/alshchetinin/zhk-starter/issues/59)
**Статус:** одобрено пользователем

## Цель

Защитить публичные формы и критические API-ручки от спама и брутфорса.
Внедрить rate limiting на горячих точках + точечное укрепление входной
валидации. CAPTCHA в объём не входит (возможное будущее расширение).

Деливерабл этапа: спека + план + **реализация** (рабочая защита).

## Поверхность (по итогам разведки)

Сервер — Hono + oRPC `RPCHandler`, auth — better-auth на `/api/auth/*`.
Сейчас нет ни rate-limit, ни Redis, ни CAPTCHA. Деплой — Coolify за Traefik
(реальный IP в `x-forwarded-for`). zhk-starter ещё не в проде — внедряем до
запуска.

Горячие точки (ранжировано по риску):

1. **`auth sign-in`** (better-auth) — брутфорс админ-логина. Защиты нет.
2. **`public.site.unlock`** ([routers/public/site.ts](../../packages/api/src/routers/public/site.ts)) — брутфорс пароля сайта. Сравнение timing-safe (хорошо), но попытки не лимитированы.
3. **`public.tickets.create`** ([routers/public/tickets.ts](../../packages/api/src/routers/public/tickets.ts)) — INSERT в БД + неблокирующий fetch к Telegram API на каждый запрос. Вектор спама заявок и DDoS на Telegram.
4. **`public.contacts.getByIds`** ([routers/public/contacts.ts](../../packages/api/src/routers/public/contacts.ts)) — массив `ids` без ограничения размера → большой IN-clause.
5. **READ-ручки `public.*.list / getBySlug`** — экспорт контента, низкий риск.

## Архитектура

Три уровня защиты, единое хранилище (Redis), общий движок
(`rate-limiter-flexible`).

```
┌─────────────────────────────────────────────────────────┐
│ Hono global ceiling (анти-флуд per-IP, fail-open)         │
│  ┌──────────────────────────────────────────────────┐    │
│  │ better-auth rateLimit (sign-in, Redis storage)    │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │ oRPC rateLimit middleware (точечно на процедурах) │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
         все три → packages/ratelimit → Redis | in-memory insurance
```

### 1. Пакет `packages/ratelimit`

Единственный источник движка. Никакой бизнес-логики — только лимитер и ключи.

- Зависимость: `rate-limiter-flexible`, `ioredis`.
- `getRedis()` — singleton ioredis из `REDIS_URL` (env). Ленивая инициализация,
  `lazyConnect`, обработчик `error` без краша процесса.
- `createLimiter(opts: { keyPrefix; points; duration; blockDuration?; failMode }): RateLimiterAbstract`
  — `RateLimiterRedis`. Поведение при недоступности Redis зависит от `failMode`:
  - `failMode: "open"` → `insuranceLimiter = RateLimiterMemory` (тех же
    параметров): rate-limiter-flexible при ошибке Redis молча переключается на
    in-memory счётчик per-инстанс. Сайт не ложится.
  - `failMode: "closed"` → **без** insuranceLimiter: при ошибке Redis
    `.consume()` реджектит с `Error` (не `RateLimiterRes`), `consume()` ловит
    это и возвращает `allowed:false`. Брутфорс-ручки закрываются, когда счётчик
    недоступен.
  Так fail-mode зашит в конструкцию лимитера, а не только в ветку middleware.
- `consume(limiter, key, failMode): Promise<RateDecision>` где
  `RateDecision = { allowed: boolean; remaining: number; retryAfterSec: number; limit: number; resetAtMs: number }`.
  - На `RateLimiterRes`-reject → `allowed:false` с `retryAfterSec`.
  - На брошенную ошибку Redis, если insurance не отработал и `failMode:"closed"`
    → `allowed:false` (block). Если `failMode:"open"` → `allowed:true`.
- `getClientIp(headers: Headers): string` — первый IP из `x-forwarded-for`
  (Traefik), фоллбэк `x-real-ip`, затем `"unknown"`. Триммит, валидирует,
  отбрасывает спуф-значения. **Источник истины для всех ключей.** Не доверять
  заголовку от клиента напрямую в обход Traefik — за этим следит deployment
  (Traefik перезаписывает `x-forwarded-for`); в dev IP может быть `unknown` —
  допустимо.
- Чистые, тестируемые единицы. `getClientIp` и `consume` (на `RateLimiterMemory`)
  покрываются unit-тестами без сети.

### 2. Конфиг лимитов — `packages/ratelimit/src/config.ts`

Дефолты + override через env (имена `RL_<SCOPE>_POINTS` / `_DURATION` /
`_BLOCK`). Числа — из таблицы ниже. Парсинг env — Zod в `@zhk/env`
(добавляются опциональные ключи), невалидные значения → дефолт + warn.

| scope | keyBy | points | duration | block | failMode |
| --- | --- | --- | --- | --- | --- |
| `authSignIn` | ip+email | 5 | 900s | 900s | closed |
| `siteUnlock` | ip+site | 5 | 600s | 600s | closed |
| `ticketCreate` | ip+site | 5 | 600s | 600s | closed |
| `ticketCreateHourly` | ip+site | 20 | 3600s | — | closed |
| `contactsGetByIds` | ip | 30 | 60s | — | open |
| `publicRead` | ip | 120 | 60s | — | open |
| `honoCeiling` | ip | 300 | 60s | — | open |

`ticketCreate` использует два лимитера (бёрст + часовой) — оба должны
разрешить.

### 3. oRPC middleware — `packages/api/src/middleware/rate-limit.ts`

`rateLimit(scope: RateLimitScope, opts?: { keyBy?; failMode? })` →
oRPC-middleware. Внутри:
- строит ключ из `getClientIp(context.headers)` + (по `keyBy`) `siteId` из
  контекста / нормализованного входного поля (email, phone);
- `consume`; при `!allowed` → `throw new ORPCError("TOO_MANY_REQUESTS", { message, data: { retryAfterSec } })`;
- кладёт `Retry-After` и `RateLimit-Limit/Remaining/Reset` в response-заголовки
  (через context-механизм проброса заголовков, как уже делает site-unlock).

Навешивается **точечно** на процедуры (декорированием существующих
`publicActiveSiteProcedure` и т.д. через `.use(rateLimit(...))` на конкретной
процедуре). READ-роутеры получают общий `publicRead` лимит, write — свои.

Тип `RateLimitScope` — union ключей конфига; добавление scope = одна правка
конфига (как `BLOCK_FIELD_TYPES`).

### 4. better-auth rateLimit

Включить `rateLimit` в конфиге better-auth ([packages/auth/src/index.ts](../../packages/auth/src/index.ts))
со `storage: "secondary-storage"` и `secondaryStorage` на том же Redis
(ioredis из `packages/ratelimit`). Кастомное правило для `/sign-in/email`:
window 900s, max 5. Так auth и формы делят одно хранилище и единый Redis —
без второго механизма.

### 5. Hono global ceiling — `apps/server/src/middleware/rate-limit.ts`

Тонкий Hono-middleware перед oRPC-handler: per-IP `honoCeiling`, fail-open.
Грубая страховка от флуда любого маршрута (включая несуществующие). При
блокировке — `429` с `Retry-After`. Не заменяет точечные лимиты, а
подстраховывает.

### 6. Укрепление входа (в объёме, дёшево)

- `contacts.getByIds`: `z.array(z.string()).max(100)` на `ids`.
- `tickets.create`: нормализация телефона (только цифры) для ключа
  `ticketCreate`, чтобы один номер с разным форматированием не обходил лимит.
  Сами данные тикета не меняем.

## Поток данных (на примере tickets.create)

1. Запрос → Hono ceiling (`honoCeiling`, ip) → пропуск.
2. oRPC middleware `rateLimit("ticketCreate", { keyBy: "ip+site" })` +
   `rateLimit("ticketCreateHourly", ...)` → оба consume.
3. Если любой `!allowed` → `TOO_MANY_REQUESTS` + `Retry-After`, handler не
   выполняется (БД и Telegram не трогаются).
4. Иначе — обычная обработка.

## Обработка ошибок и fail-mode

- **Redis недоступен**: для `failMode:"open"` scopes insurance-limiter
  (in-memory) подхватывает счёт → локальный fail-open per-инстанс, сайт
  работает. Для `failMode:"closed"` scopes (auth, site-unlock, ticket-create)
  insurance отключён → `consume()` ловит ошибку Redis и возвращает
  `allowed:false`, middleware отвечает `429` — брутфорс важнее доступности
  (решение пользователя). Это поведение задаётся `failMode` в `createLimiter`,
  см. §1.
- **429-контракт**: oRPC `TOO_MANY_REQUESTS` → HTTP 429; web показывает тост
  «Слишком много попыток, повторите через N секунд» (N из `retryAfterSec`).
- **Заголовки**: `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`,
  `RateLimit-Reset` на лимитированных ответах.

## Веб-сторона (apps/web)

- Обработчики submit форм (`tickets.create`, `site/unlock`) ловят 429 и
  показывают человекочитаемый тост с обратным отсчётом, дизейблят кнопку до
  `retryAfter`. Точечно в `ModalProvider.vue` и `SitePasswordGate.vue` /
  `server/api/site/unlock.post.ts` (пробрасывает 429 наверх).

## Инфраструктура

- **Redis**: локально — сервис в `docker-compose` (рядом с Postgres);
  прод — Coolify Redis-ресурс, `REDIS_URL` в env сервера.
- **env** (`@zhk/env` server): `REDIS_URL` (обязателен в проде, в dev — дефолт
  `redis://localhost:6379`), опциональные `RL_*` оверрайды.
- Если `REDIS_URL` не задан в dev — лимитеры работают на `RateLimiterMemory`
  (без Redis), функциональность сохраняется локально.

## Тестирование

Vitest (инфраструктура уже есть, `pnpm test`).

- `packages/ratelimit`: `getClientIp` (нормальный XFF, несколько IP, спуф,
  пусто); `consume` на `RateLimiterMemory` с детерминированным временем
  (allow до лимита, deny после, block-duration, remaining/retryAfter); конфиг
  (дефолты, env-override, невалидный env → дефолт).
- `packages/api`: middleware `rateLimit` — фейковый контекст/лимитер,
  проверка ключей по `keyBy`, проброс `TOO_MANY_REQUESTS` и заголовков,
  fail-open/closed ветки; `contacts.getByIds` отвергает массив >100.
- better-auth конфиг — smoke (rateLimit включён, storage указывает на Redis).
- Не тестируем живой Redis в unit (in-memory достаточно); интеграционная
  проверка с Redis — в ручном прогоне плана.

## Вне объёма (осознанно)

- CAPTCHA / Turnstile (будущее расширение, если спам прорвётся).
- Honeypot-поля форм.
- Распределённый блок-лист / fail2ban-интеграция.
- Rate-limit на admin-роуты (за auth, низкий приоритет) — кроме самого
  sign-in.
- Миграция существующего трафика — система до прода, миграции нет.
