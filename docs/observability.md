# Наблюдаемость (@sentry/node → GlitchTip Issues)

Простой слой error-tracking: неожиданные ошибки приложения уходят в self-hosted
**GlitchTip** (Sentry-совместимый дашборд Issues: группировка, алёрты, resolve/ignore)
через официальный SDK Sentry. Цель — надёжный, AI-читаемый трекинг ошибок (why/fix/code),
тегированный `siteId` (мультитенантность). Всё максимально просто: starter копируется
на много сайтов.

## Почему только @sentry/node (а не evlog)

Раньше слой строился на `evlog` + `@sentry/node`. Оказалось, что `evlog` ставится
pnpm как **несколько физических копий** (варианты под peer-deps `@nuxt/kit` /
`@orpc/server` / `@opentelemetry`), и module-global конфиг логгера (drain + редакция),
заданный в одной копии, НЕ применяется к событиям, созданным в другой → из реального
работающего приложения в бэкенд не доходило НИЧЕГО. `@sentry/node` (одна копия) работает
надёжно.

**Решение: evlog полностью убран. Только `@sentry/node` → GlitchTip Issues.**

## Архитектура

```
apps/server (Hono/oRPC) ─ initObservability на старте; oRPC-middleware ловит ошибки
│                          процедур и шлёт неожиданные в Issues (теги operation/siteId);
│                          app.onError ловит Hono-level/uncaught
apps/admin (Nuxt SPA) ──── @sentry/nuxt (client + server): ошибки админки → GlitchTip
apps/web   (Nuxt SSR) ──── @sentry/node + Nitro error-hook: ТОЛЬКО серверные/SSR ошибки
│                          (браузерный SDK НЕ подключён — публичный сайт держим лёгким)
packages/observability ─── общий @sentry/node-обвяз: initSentry, captureUnexpected,
                           каталог ошибок appErrors. DSN читается ТОЛЬКО на сервере.
                                   │  (если задан GLITCHTIP_DSN, иначе no-op)
                                   ▼
                         GlitchTip (внешний, Sentry-совместимый) — Issues + алёрты
```

Что инструментировано:
- **Server** (`apps/server`) — `initObservability("zhk-server")` на старте; oRPC-процедуры
  через middleware `sentryCapture` ([`packages/api/src/orpc-base.ts`](../packages/api/src/orpc-base.ts)):
  ловит ошибки, шлёт неожиданные (5xx / не-`ORPCError`) в Issues с тегами `operation`/`siteId`
  и `userId`/`why`/`fix` в extra, потом пробрасывает дальше (ответ клиенту не меняется).
  `app.onError` ловит Hono-level/необработанные ошибки.
- **Admin** (`apps/admin`) — модуль `@sentry/nuxt` + `sentry.client.config.ts` /
  `sentry.server.config.ts` (читают DSN из public runtimeConfig / env, `Sentry.init` no-op
  без DSN). Source-map upload выключен (self-hosted, без auth-токена).
- **Web** (`apps/web`) — Nitro-плагин [`server/plugins/sentry.ts`](../apps/web/server/plugins/sentry.ts):
  `initSentry(GLITCHTIP_DSN)` + хук Nitro `error` → `captureUnexpected`. Только серверные/SSR
  ошибки, браузерного SDK нет (публичный сайт лёгкий, DSN в браузер не утекает).

## Что считается «неожиданным» (только это → Issues)

`captureUnexpected` (в [`packages/observability/src/sentry.ts`](../packages/observability/src/sentry.ts))
шлёт в Issues ТОЛЬКО:

- `ORPCError` со статусом **>= 500**, ИЛИ
- любой не-`ORPCError` throw (обычный `Error` и т.п. — статус неизвестен → считаем неожиданным).

Ожидаемые доменные **4xx** (NOT_FOUND / UNAUTHORIZED / FORBIDDEN / TOO_MANY_REQUESTS /
BAD_REQUEST) пропускаются — это нормальный control-flow, а не баг, и в Issues их не шлём
(чистый дашборд, без спама). Фильтр — чистая функция `isUnexpectedError(status)`
(покрыта unit-тестами).

## Каталог доменных ошибок (why/fix в ORPCError.data)

Источник истины — [`packages/observability/src/errors.ts`](../packages/observability/src/errors.ts).
Это простые фабрики, возвращающие `ORPCError`. `code`/`why`/`fix` лежат в `ORPCError.data`
(их читают `captureUnexpected` для Sentry-тегов и клиент). `ORPCError` сам мостит код в
HTTP-статус (`NOT_FOUND`→404, `TOO_MANY_REQUESTS`→429, `FORBIDDEN`→403, ...).

```ts
import { ORPCError } from "@orpc/server";

export const appErrors = {
  NOT_FOUND: ({ entity }: { entity: string }) =>
    new ORPCError("NOT_FOUND", {
      message: `${entity} не найден`,
      data: {
        code: "app.NOT_FOUND",
        why: "Запись отсутствует в текущем сайте/скоупе либо удалена",
        fix: "Проверьте id и siteId; запись могла быть удалена каскадом",
      },
    }),
  // ...
};
```

Бросать в oRPC-процедуре: `throw appErrors.NOT_FOUND({ entity: "Страница" });`. Это
обычная 4xx — клиенту вернётся 404, в Issues она НЕ попадёт. Конвенция: для повторяющихся
доменных случаев предпочитать каталог вместо «голого» `new ORPCError(...)`, чтобы `why`/`fix`
были при ошибке.

## Включить отправку в GlitchTip

Один выключатель — env-переменная **`GLITCHTIP_DSN`** (в `apps/server/.env`,
схема — [`packages/env/src/server.ts`](../packages/env/src/server.ts), `z.string().optional()`):

- **не задана / пусто** → отправка выключена (`initSentry` и `Sentry.init` — no-op).
  Приложение работает штатно, ошибки только в консоль.
- **задана** (`http://<key>@host:port/<project>`) → серверные ошибки server/web и ошибки
  admin (client+server) уходят в GlitchTip Issues.

DSN читается серверным кодом (`initObservability`, Nitro-плагин web, `sentry.server.config.ts`
админки). Для admin SPA DSN попадает в браузер через public runtimeConfig — это допустимо
(Sentry DSN — публичный ingest-ключ по дизайну; админка внутренняя).

## Тегирование siteId (мультитенантность)

oRPC-middleware кладёт `siteId` из контекста в теги Issue (`context.siteId`), плюс
`operation` (путь процедуры, напр. `pages.getById`) и `userId` из сессии. В GlitchTip
можно фильтровать/группировать Issues по сайту.

## Локальный GlitchTip (для проверки)

Standalone, **отдельно от проекта** — [`observability/glitchtip.compose.yml`](observability/glitchtip.compose.yml):

```bash
docker compose -f docs/observability/glitchtip.compose.yml up -d   # ~30-60с на миграции
# открыть http://localhost:8000 → зарегистрироваться (первый юзер = админ)
# создать Organization + Project (платформа Node/JavaScript) → скопировать DSN
# вставить в apps/server/.env:  GLITCHTIP_DSN=http://<key>@localhost:8000/1
docker compose -f docs/observability/glitchtip.compose.yml down     # остановить
docker compose -f docs/observability/glitchtip.compose.yml down -v  # + удалить данные
```

Затем перезапустить `pnpm dev:server` (и `pnpm dev:admin`), спровоцировать неожиданную
ошибку (5xx / необработанный throw) — она должна появиться в GlitchTip **Issues**.

> Важно при `Sentry.init`: **не** ставить `defaultIntegrations: false` — с ним
> `@sentry/node` перестаёт доставлять события (проверено против GlitchTip: событие
> создаётся, но не уходит). Дефолтные интеграции лёгкие и нужны для пайплайна доставки
> + ловят uncaught/unhandledRejection. Трейсинг не включаем (`tracesSampleRate` не задаём).

## Прод (Phase 2)

Деплой GlitchTip на прод (Coolify) — **отдельная фаза**. План: поднять GlitchTip на
`errors.<домен>` (Traefik + SMTP для алёртов) и прописать прод-`GLITCHTIP_DSN` в окружении
сервера/Nuxt. Код не меняется — только env-переменная.
