# Наблюдаемость (evlog + опц. GlitchTip)

Сквозной слой наблюдаемости на [`evlog`](https://www.evlog.dev): AI-читаемые структурные
ошибки + структурные логи (wide events) во всём приложении, с опциональной отправкой в
self-hosted **GlitchTip** (дашборд ошибок + алёрты). Спека/план:
[`superpowers/specs/2026-06-13-observability-evlog-glitchtip-design.md`](superpowers/specs/2026-06-13-observability-evlog-glitchtip-design.md),
[`superpowers/plans/2026-06-13-observability-evlog.md`](superpowers/plans/2026-06-13-observability-evlog.md).

## Решение по дрейну evlog→GlitchTip (спайк — выполнен 2026-06-13)

Проверено против реального GlitchTip v6.1.8. **GlitchTip принимает оба формата Sentry-протокола,
в разные разделы:**

- **`log`-type** (то, что шлёт нативный `evlog/sentry`-дрейн) → раздел **Logs**. Работает:
  wide events со всем структурным контекстом (`why`/`fix`, юзер, operation) видны и ищутся в Logs.
- **`event`-type** (то, что шлёт `@sentry/node`) → раздел **Issues** (группировка, алёрты,
  resolve/ignore — классический error-tracking).

**Итог: оба пути, дополняют друг друга.**
- **Путь A (evlog-дрейн → Logs)** — реализован, кормит GlitchTip Logs всеми событиями.
- **Путь B (`@sentry/node` → Issues)** — добавлен поверх: неожиданные ошибки (5xx/uncaught)
  идут в Issues с перенесёнными `code`/`why`/`fix`/`operation`/`userId`. Ожидаемые доменные
  4xx (NOT_FOUND/401/429) в Issues НЕ шлются (чтобы не спамить) — они остаются в Logs.

DSN остаётся server-side в обоих путях (браузерного Sentry-SDK нет; клиентские ошибки идут через
evlog-transport на сервер и уже там превращаются в Issues).

## Архитектура

```
apps/server (Hono/oRPC) ─ полный evlog: wide event на запрос, Better Auth-идентификация,
│                          app.onError, каталог структурных ошибок, PII-редакция
apps/admin (Nuxt SPA) ──┐ перехват клиентских ошибок → evlog transport (/api/_evlog/ingest)
apps/web   (Nuxt SSR) ──┘ → Nitro-сервер приложения → дрейн
packages/observability ── общий конфиг evlog (initObservability), каталог ошибок (appErrors),
                          env-gated дрейн. DSN читается ТОЛЬКО на сервере (в браузер не попадает).
                                   │  (опц., если задан GLITCHTIP_DSN)
                                   ▼
                         GlitchTip (внешний, Sentry-совместимый) — дашборд + алёрты
```

Что инструментировано:
- **Server** — `initObservability("zhk-server")` на старте; oRPC-процедуры через `evlog()`
  middleware (одно wide event на запрос, `context.log`, мост structured-error→`ORPCError`);
  `identifyUser` из уже резолвнутой Better Auth-сессии; `app.onError` отдаёт `{message, code}`.
- **Admin/web** — модуль `evlog/nuxt` + `transport` шлёт клиентские ошибки на сервер; Nitro-плагин
  `server/plugins/evlog-drain.ts` дренит в GlitchTip при заданном DSN.

## Как читать ошибки (человек и ИИ)

Каждая доменная ошибка — **структурная**, с полями для немедленного понимания:

```
ERROR [app] POST /rpc/pages.getById 404 in 5ms
  ├─ error: Страница не найден
  │   Why:  Запись отсутствует в текущем сайте/скоупе либо удалена
  │   Fix:  Проверьте id и siteId; запись могла быть удалена каскадом
  ├─ user: id=… (если залогинен; email/телефон маскируются)
  └─ operation: pages.getById
```

- `code` — машиночитаемый идентификатор (`app.NOT_FOUND`), стабилен для ветвления на клиенте
  (`parseError(err).code`).
- `why` / `fix` / `link` — почему случилось, как чинить, ссылка. Это и есть «понятно для ИИ»:
  модель видит причину и способ исправления прямо в логе, без догадок.
- **wide event** — весь контекст запроса (роут, тайминг, юзер, operation) в одном объекте, а не
  разбросанные строки.

## Каталог доменных ошибок

Источник истины — [`packages/observability/src/errors.ts`](../packages/observability/src/errors.ts).
Добавить новую ошибку:

```ts
export const appErrors = defineErrorCatalog("app", {
  // ...
  MY_ERROR: {
    status: 409,
    message: "Короткое сообщение для пользователя",
    why: "Техническая причина (для разработчика/ИИ)",
    fix: "Что сделать, чтобы починить",
    link: "docs/...", // опционально
  },
});
```

Бросать в oRPC-процедуре: `throw appErrors.MY_ERROR();` (или `appErrors.MY_ERROR({ ...args })`
для динамического `message`). evlog/orpc middleware сам смостит её в `ORPCError`-ответ — wire
code будет `app.MY_ERROR`, status и message сохранятся. Конвенция: предпочитать каталог
вместо «голого» `new ORPCError(...)` для повторяющихся доменных случаев.

## Включить дрейн в GlitchTip

Один выключатель — env-переменная **`GLITCHTIP_DSN`** (в `apps/server/.env`):

- **не задана / пусто** → дрейн выключен, только pretty-console (dev) / stdout (прод). Приложение
  работает штатно.
- **задана** (`http://<key>@host:port/<project>`) → server и клиентские ошибки уходят в GlitchTip.

DSN читается только серверным кодом (`initObservability`, Nitro drain-плагины) — в браузер он
не попадает (модуль `evlog/nuxt` кладёт в публичный конфиг лишь endpoint transport'а).

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

Затем перезапустить `pnpm dev:server` (и `pnpm dev:admin`), спровоцировать ошибку — она должна
появиться в GlitchTip Issues. Это и есть прогон спайка (раздел «Решение по дрейну» выше).

## PII-редакция

Включена в `initObservability` (`redact`). По умолчанию evlog частично маскирует значения
email/телефонов/IP/JWT/bearer/IBAN/карт. Дополнительно по имени поля полностью редактируются
`password`, `accessPassword`, `*_token`, `phone`. Новые чувствительные поля — добавлять в
`paths` в [`packages/observability/src/config.ts`](../packages/observability/src/config.ts).

## Прод (Phase 2)

Деплой GlitchTip на прод (Coolify) — **отдельная фаза**, не входит в текущую итерацию. План:
поднять GlitchTip на `errors.<домен>` (Traefik + SMTP для алёртов) и прописать прод-`GLITCHTIP_DSN`
в окружении сервера/Nuxt. Код Phase 1 не меняется — только env-переменная.
