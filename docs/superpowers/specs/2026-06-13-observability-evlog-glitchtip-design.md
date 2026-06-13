# Наблюдаемость: evlog + (опц.) GlitchTip

**Issue:** [#64](https://github.com/alshchetinin/zhk-starter/issues/64)
**Дата:** 2026-06-13
**Статус:** дизайн

## Проблема

У приложения **нулевая наблюдаемость**: только разрозненные `console.error` (seed,
scheduler), нет `app.onError` в Hono, нет error-плагинов в Nuxt, нет структурного
логирования. В проде мы слепы к ошибкам — нельзя ни найти, ни понять, ни получить алёрт.

## Цель

Сквозной слой наблюдаемости: **AI-читаемые структурные ошибки** + структурные логи
(wide events) во всём приложении, с опциональной отправкой в self-hosted **GlitchTip**
(дашборд ошибок + алёрты). Ошибки должны быть одинаково понятны и человеку, и ИИ.

## Не-цели (вне скоупа)

- GlitchTip НЕ кладём в репозиторий/compose проекта — он внешний, подключается через env-DSN.
- Прод-деплой GlitchTip (Coolify) — отдельная Phase 2, не в этой итерации (runbook включаем).
- Полный distributed tracing / APM — позже.
- Не заменяем существующий `useTracking()` (продуктовая аналитика Метрики) — это другой слой.

## Принятые решения

| Вопрос | Решение |
| --- | --- |
| Подход | **A**: evlog (инструментирование) + опц. GlitchTip (приёмник) |
| Объём v1 | Server — полный evlog (wide events + каталог ошибок); admin/web — перехват ошибок |
| Подключение GlitchTip | Через env `GLITCHTIP_DSN` (пусто → дрейн выкл, только console) |
| GlitchTip в репо | Нет. Внешний. Локально для проверки — отдельный compose в `docs/` |
| Инструмент | `evlog` v2.x (MIT, нативен для Nuxt/Hono/oRPC/Better Auth) |

## Ключевой риск и ранняя валидация

`evlog/sentry` (`createSentryDrain`) по доке шлёт wide events в **Sentry _Logs_**, а
GlitchTip — приёмник **ошибок/issues** (Sentry events). Неизвестно, принимает ли GlitchTip
поток от этого дрейна и показывает ли его как issues.

**Поэтому Phase 1 начинается со спайка** (Task 0): поднять локальный GlitchTip, направить на
него `createSentryDrain({ dsn: GLITCHTIP_DSN })`, кинуть тестовую ошибку, проверить, что она
видна в дашборде GlitchTip. Результат определяет ветку дизайна:

- **Если дрейн долетает в GlitchTip-issues** → используем только evlog (один слой
  инструментирования, ошибки и логи через evlog-дрейн). Предпочтительно.
- **Если нет** (дрейн умеет только Sentry-Logs) → фолбэк: evlog остаётся слоем структурных
  логов/ошибок (console/file + при желании OTLP/Better Stack дрейн для поиска), а в GlitchTip
  ошибки-issues шлём тонким слоем `@sentry/node` + `@sentry/nuxt` (`captureException`),
  указав ему `GLITCHTIP_DSN`. evlog и Sentry-SDK сосуществуют: evlog обогащает контекст,
  Sentry-SDK отвечает за issue-трекинг.

Спайк дешёвый и снимает единственную архитектурную неизвестность до основной работы.

## Архитектура (слои)

```
┌─ apps/server (Hono/oRPC) ─ полный evlog: wide event/запрос, каталог ошибок, Better Auth id
├─ apps/admin (Nuxt SPA) ── перехват необработанных ошибок → дрейн
├─ apps/web   (Nuxt SSR) ── перехват необработанных ошибок (Vue + Nitro) → дрейн
└─ packages/observability ─ общий конфиг evlog, инициализация дрейна, каталог ошибок
                            (env-gated: GLITCHTIP_DSN пусто → только pretty-console)
                                   │  (опц., если DSN задан)
                                   ▼
                         GlitchTip (внешний, env-DSN) — дашборд ошибок + алёрты
```

### Новый пакет `packages/observability`

Единая точка конфигурации evlog (по образцу `packages/ratelimit`):

- инициализация evlog с pretty-console (dev) и env-gated Sentry/GlitchTip дрейном;
- общий **каталог структурных ошибок** (типизированный, с `why`/`fix`/`link`);
- хелперы редакции PII (телефоны/email лидов);
- экспорт для server и Nuxt-слоёв.

Точные имена модулей evlog (`evlog`, `evlog/hono`, `evlog/sentry`, `evlog/nuxt`,
`evlog/better-auth`) сверяются с актуальной докой на этапе плана.

## Server (Hono/oRPC) — полный evlog

- **Wide event на запрос:** middleware `evlog/hono` создаёт `log` в контексте Hono
  (`c.get('log')`), один богатый событие-объект на запрос (роут, метод, статус, тайминг).
- **oRPC:** обогащение контекста процедур (`withEvlog()` / эквивалент) — имя процедуры,
  вход (с редакцией), исход.
- **Идентификация юзера:** `createAuthMiddleware(auth, { exclude: ['/api/auth/**'] })`
  + `identifyUser` из evlog/better-auth — на каждое событие попадают `userId`, безопасные
  поля `user`/`session` (whitelist, без паролей/токенов; email маскируется `maskEmail`).
  Better Auth уже стоит (`@zhk/auth`).
- **Необработанное:** `app.onError` (Hono) логирует через evlog как структурную ошибку и
  (если включён дрейн) шлёт в GlitchTip; единый JSON-ответ клиенту без утечки внутренностей.
- **Каталог доменных ошибок:** типизированные ошибки с `why`/`fix`/`link` для повторяющихся
  доменных случаев (например: rate-limit превышен, сущность не найдена, конфликт sync,
  невалидный блок). Бросаются из oRPC-процедур, отображаются в логе как actionable.
- **PII-редакция:** конфиг auto-redaction (телефоны, email, токены) + кастомные поля под
  модель лидов/тикетов.

## Client (admin/web) — перехват ошибок

Тоньше сервера — ловим необработанное, не строим полные wide events:

- Nuxt-плагин: `vueApp.config.errorHandler` + `app:error` хук → evlog/дрейн.
- SSR (web): Nitro error-хук (`error` / `evlog:drain` через `defineNitroPlugin`).
- Дрейн в GlitchTip — тот же env-gated `GLITCHTIP_DSN` (через runtimeConfig, public только
  если нужен client-side DSN; предпочтительно слать клиентские ошибки через server-proxy,
  чтобы не светить DSN в браузере — решается на этапе плана).

## Конфигурация (env)

- **`GLITCHTIP_DSN`** — единственный выключатель. Пусто/не задан → дрейн выключен,
  только pretty-console (dev и прод-stdout). Задан → evlog шлёт ошибки/события в GlitchTip
  через `createSentryDrain({ dsn: process.env.GLITCHTIP_DSN })` (явный `dsn`, чтобы имя env
  было «человеческим», а не дефолтным `SENTRY_DSN`).
- Доп. (опц.): `OBSERVABILITY_ENV` (environment-тег), `OBSERVABILITY_SAMPLE_RATE`.
- Добавляются в `packages/env` схему (как остальные env проекта).

## Локальный GlitchTip (для проверки)

Отдельный `docs/observability/glitchtip.compose.yml` (НЕ в основном docker-compose проекта) +
runbook в `docs/observability.md`:

- 4 контейнера GlitchTip (web, celery-worker, postgres, redis), ~0.5-1ГБ RAM;
- поднимается рядом с проектом (`docker compose -f ... up`), проект к нему подключается через
  `GLITCHTIP_DSN` в `.env`;
- инструкция: создать проект в GlitchTip-UI, скопировать DSN, вставить в `.env`, проверить.

## AI-читаемость

- **Конвенция структурных ошибок:** каждая доменная ошибка несёт `why` (почему случилось),
  `fix` (как чинить), `link` (на доку/код). Wide events — весь контекст запроса в одном
  объекте (юзер, роут, тайминг, редактированный вход), а не разбросанные строки.
- **Дока `docs/observability.md`:** как читать ошибки/события (для людей и ИИ), как добавить
  новую запись в каталог ошибок, как включить дрейн, runbook локального GlitchTip.

## Фазы

- **Phase 1 (этот спринт):**
  0. Спайк evlog→локальный GlitchTip (валидация дрейна, выбор ветки дизайна).
  1. `packages/observability` (конфиг, каталог ошибок, env-gated дрейн).
  2. Server: evlog/hono + oRPC + Better Auth identify + `app.onError` + PII-редакция.
  3. Admin/web: перехват необработанных ошибок.
  4. `docs/observability.md` + локальный GlitchTip compose.
- **Phase 2 (позже, отдельно):** прод-GlitchTip на Coolify (`errors.<домен>`, Traefik, SMTP
  для алёртов) по runbook → прописать прод-`GLITCHTIP_DSN`. Код Phase 1 не меняется.

## Тестирование / верификация

- CRUD-роутеры в репо юнит-тестами не покрыты; основная верификация — типы (`pnpm check-types`)
  + ручная.
- Спайк (Task 0): тестовая ошибка реально видна в локальном GlitchTip-дашборде.
- Юнит-тесты на каталог структурных ошибок и PII-редакцию (детерминированная логика —
  тестируется, в отличие от CRUD; кладём в `packages/observability/__tests__`).
- Ручная проверка: бросить ошибку в oRPC-процедуре → видно структурную ошибку в консоли с
  `why`/`fix` и идентифицированным юзером; при заданном DSN — долетает в GlitchTip.
- Проверка, что при пустом `GLITCHTIP_DSN` приложение работает штатно (дрейн просто выключен).

## Открытые вопросы (решаются в плане/спайке)

- Долетает ли `evlog/sentry`-дрейн в GlitchTip-issues (Task 0 решает; фолбэк на @sentry/* готов).
- Клиентский DSN: прямой из браузера vs server-proxy (предпочтительно proxy, чтобы не светить DSN).
- Точные имена/сигнатуры evlog-API (сверяются с докой в начале плана).
