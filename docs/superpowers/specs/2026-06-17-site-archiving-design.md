# Архивация сайтов с восстановлением

**Дата:** 2026-06-17
**Issue:** [#74](https://github.com/alshchetinin/zhk-starter/issues/74)
**Статус:** дизайн утверждён

## Проблема

Сейчас единственный способ убрать сайт — `sites.delete`, которое необратимо стирает
запись из БД. Оно же фактически сломано: на `sites` ссылается 31 таблица, а
`onDelete: "cascade"` стоит лишь у 4 (`content_versions`, `form_receivers`,
`modals`, `social_links`). Для сайта с реальным контентом (страницы, новости,
проекты, каталог) удаление упирается в FK-конфликт и падает.

Нужно: безопасно «убирать» сайт с возможностью восстановления — так, чтобы он не
отдавался в вебе и не попадал в навигацию, но мог вернуться. Необратимое стирание
оставить, но как отдельный осознанный шаг.

## Ключевое наблюдение

«Деактивация» в продукте **уже существует** — флаг `sites.isActive`. При
`isActive: false`:

- контент не отдаётся: middleware `requireActiveSite`
  ([`packages/api/src/index.ts:22`](../../../packages/api/src/index.ts)) кидает
  `FORBIDDEN / SITE_INACTIVE`;
- навигация не строится: `publicActiveSiteProcedure`
  ([`packages/api/src/routers/public/navigation.ts`](../../../packages/api/src/routers/public/navigation.ts))
  блокирует неактивный сайт;
- сайт уходит в `noindex` + `Disallow: /`: `isSiteIndexable`
  ([`packages/api/src/shared/seo.ts:9`](../../../packages/api/src/shared/seo.ts))
  требует `isActive` (управляет `robots.txt` и `sitemap.xml`).

Поэтому задача не про «деактивацию» (она есть), а про **обратимое удаление** =
архивацию, плюс починку необратимого удаления.

## Модель данных

Одно новое поле в таблице `sites`
([`packages/db/src/schema/sites.ts`](../../../packages/db/src/schema/sites.ts)):

- `archivedAt: timestamp | null` — `null` по умолчанию.

`isActive` **не трогаем** — он остаётся флагом «черновик/скрыт». Архив
ортогонален ему, без перехода на enum-статус (минимальный диффузный риск:
`isActive` используется в SEO, middleware, дублировании, админке).

Три состояния:

| Состояние | Поля | Где виден | Контент в вебе |
|---|---|---|---|
| Активен | `isActive: true`, `archivedAt: null` | основной список | отдаётся |
| Скрыт (черновик / в работе) | `isActive: false`, `archivedAt: null` | основной список, пилл «Скрыт» | нет (как сейчас) |
| В архиве | `archivedAt: <дата>` (значение `isActive` любое) | только вкладка «Архив» | нет, невидим даже для резолва по Host |

## Сервер (oRPC `sites`)

Роутер [`packages/api/src/routers/sites.ts`](../../../packages/api/src/routers/sites.ts).

- `list({ archived?: boolean })` — по умолчанию `archived: false` → отдаёт только
  `archivedAt IS NULL` (текущая сортировка сохраняется). С `archived: true` →
  только архив (`archivedAt IS NOT NULL`), сортировка по `archivedAt DESC`.
  *(Сейчас `list` без параметров отдаёт всё — меняем фильтрацию.)*
- `archive({ id })` — `archivedAt = now()`. **Запрет на primary-сайт** (как
  текущий guard в `delete`): архивировать главный нельзя — сначала назначить
  главным другой через `makePrimary`.
- `restore({ id })` — `archivedAt = null`, при этом `isActive` принудительно
  ставится в `false`. Сайт возвращается в основной список как «Скрыт» — чтобы
  restore случайно не выкатил его в прод.
- `deletePermanent({ id })` — текущая логика `delete` (необратимое стирание
  строки + каскад), но **разрешена только если сайт уже в архиве**
  (`archivedAt IS NOT NULL`); иначе `BAD_REQUEST`. Запрет на primary сохраняется.
- Старая `delete` превращается в `deletePermanent` (отдельной «удалить активный
  сайт сразу» не остаётся).

Все мутации — `adminProcedure` (как сейчас).

## Механизм необратимого удаления (починка каскада)

Проставить `onDelete: "cascade"` на **все** FK-ссылки на `sites.id` в схеме
([`packages/db/src/schema/*`](../../../packages/db/src/schema)) — декларативно,
как уже сделано у 4 таблиц. Сгенерировать миграцию Drizzle. Тогда
`deletePermanent` чистит весь контент сайта одним `DELETE` строки сайта.

Каскад срабатывает **только при удалении строки `sites`**, а это происходит
исключительно внутри `deletePermanent`. Для остального кода поведение FK не
меняется.

Отвергнутая альтернатива: ручной сервис-«анти-`duplicateSite`», удаляющий
дочерние строки в обратном FK-порядке. Дублирует знание о схеме и легко
рассинхронится при добавлении новых таблиц.

## Веб и резолв по Host

- `resolveSiteFromHost`
  ([`packages/api/src/utils/resolve-site.ts`](../../../packages/api/src/utils/resolve-site.ts))
  **исключает архивные** (`archivedAt IS NULL` во всех ветках выборки —
  customDomain, slug, primary-фолбэк). Архивный сайт по своему поддомену/домену
  больше не резолвится → Host падает на primary-фолбэк. Архив реально исчезает из
  веба; отдельная проверка в `requireActiveSite` не нужна.
- `slug` и `customDomain` остаются занятыми, пока сайт в архиве (уникальные
  ограничения держатся) — чтобы restore был чистым. **Освобождаются только при
  `deletePermanent`.**
- Создать новый сайт с тем же `slug`/`customDomain`, что у архивного, нельзя до
  его окончательного удаления — это явно подсвечиваем в тексте ошибки `create`
  (сообщить, что значение занято архивным сайтом).

## Админка (`apps/admin/app/pages/sites`)

- [`index.vue`](../../../apps/admin/app/pages/sites/index.vue): действие
  «Удалить» заменяется на **«В архив»** (с подтверждением). Список тянет
  `sites.list()` (без архива).
- Новая вкладка/страница **«Архив»** (`sites.list({ archived: true })`): на
  каждой строке «Восстановить» и «Удалить навсегда».
  - «Восстановить» → `restore`, тост, инвалидация обоих списков.
  - «Удалить навсегда» → модалка-подтверждение с **вводом slug** сайта (т.к.
    необратимо и каскадно сносит весь контент) → `deletePermanent`.
- Пиллы состояния: «Скрыт» / «Под паролем» — как сейчас; для архива пилл «В
  архиве».
- Оптимистичные апдейты vue-query как в остальной админке (снапшот → фильтрация
  → rollback в `onError` → invalidate в `onSettled`), ключи `$orpc.sites.*`.

## Edge-кейсы

- **Primary-сайт:** нельзя архивировать и нельзя `deletePermanent` (как сейчас у
  `delete`).
- **Дублирование сайта:** `duplicateSite` не затрагивается — создаёт сайт с
  `archivedAt: null`.
- **`public.site.sitemap` / robots / sitemap-роуты:** не active-gated, резолвят
  сайт; для архивного `resolveSiteFromHost` вернёт primary-фолбэк (контент чужого
  архива не утечёт). Приемлемо.
- **Custom domain архивного сайта**, всё ещё указывающий DNS на приложение →
  резолв падает на primary. Инфраструктурный нюанс, в скоупе не правим.

## Вне скоупа (YAGNI)

- Авто-очистка архива по таймеру/ретеншену.
- Восстановление отдельных под-сущностей сайта (архив — целиком на уровне сайта).
- Версионирование/снапшоты контента перед удалением.

## Тестирование

- **Unit (vitest):**
  - `archive` запрещает primary; `deletePermanent` запрещён вне архива и для
    primary; `restore` сбрасывает `archivedAt` и ставит `isActive: false`.
  - `list` корректно фильтрует по `archivedAt` для обоих значений флага.
- **Резолв:** `resolveSiteFromHost` не находит архивный сайт ни по slug, ни по
  customDomain, отдаёт primary-фолбэк.
- **Каскад на реальной БД:** создать сайт с контентом (страница/новость/проект) →
  `deletePermanent` → дочерние строки исчезли, FK-конфликта нет. Прогон в
  rollback-транзакции.
- **Браузерная проверка** через preview-стек: архивировать сайт из списка →
  пропал из основного, появился в «Архив» → restore (вернулся «Скрыт») → снова в
  архив → «Удалить навсегда» с вводом slug.

## Затрагиваемые файлы (ориентир)

- `packages/db/src/schema/sites.ts` — поле `archivedAt`.
- `packages/db/src/schema/*` — `onDelete: "cascade"` на FK → `sites.id` (27 таблиц).
- `packages/db` миграция Drizzle.
- `packages/api/src/routers/sites.ts` — `list` (фильтр), `archive`, `restore`,
  `deletePermanent`.
- `packages/api/src/utils/resolve-site.ts` — исключение архивных.
- `apps/admin/app/pages/sites/index.vue` — действие «В архив».
- `apps/admin/app/pages/sites/archive.vue` (новый) — список архива + restore +
  delete-forever.
