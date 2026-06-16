# Универсальный конструктор навигации хедера/футера

**Issue:** [#73](https://github.com/alshchetinin/zhk-starter/issues/73)
**Дата:** 2026-06-16
**Статус:** дизайн

## Проблема

Навигация хедера и футера сейчас **захардкожена**. [`apps/web/app/composables/useNavigation.ts`](../../../apps/web/app/composables/useNavigation.ts)
отдаёт статичный массив из 4 пунктов (`Проекты / Новости / Документы / Акции`), одинаковый для всех
сайтов. [`WebHeader.vue`](../../../apps/web/app/components/WebHeader.vue) рисует одну вёрстку (десктоп-меню
в строку + бургер + CTA), вложенности/выпадашек нет. [`WebFooter.vue`](../../../apps/web/app/components/WebFooter.vue)
жёстко 3 колонки.

У разных клиентов навигация структурно разная: где-то список с вложенностями + бургер, где-то только
бургер с разными списками, где-то 2 колонки в футере, где-то 4. Сейчас под это нет ни механизма данных,
ни предсказуемого контракта — каждый раз правится код.

При этом **контакты и соцсети уже динамичны** — тянутся через `public.contacts.layout` из
`sites.settings.contactsHeaderIds/FooterIds`. На этот рабочий паттерн и опираемся.

## Цель

Дать **универсальный контракт данных навигации**, против которого разработчик клиента верстает свой
единственный хедер/футер, не изобретая структуру заново, а клиент наполняет пункты меню в админке per-site.

## Ключевые решения (из брейншторма)

| Решение | Выбор |
| --- | --- |
| Вариативность вёрстки | **Вид один на инсталляцию стартера.** Один клиент = один форк стартера = один свёрстанный хедер/футер. Другой клиент = другой стартер. |
| Реестр вёрсток / переключение вида | **Не делаем.** Внутри инсталляции выбирать не из чего — нет ключей, диспетчера, `settings.layout`, манифеста. |
| Данные навигации | **Настраиваются клиентом в админке**, per-site (`sites.settings.navigation`). Города-дубли копируют и правят меню сами. |
| Структура хедера | Дерево пунктов `NavItem[]`, вложенность **1 уровень** (выпадашка/мегаменю). |
| Структура футера | Массив колонок `FooterColumn[]` — число колонок = длина массива (так «2 vs 4» решается без кода). |
| Типы целей пункта | `page`, `route` (спец-раздел), `category` (авто-подменю), `url`, `action` (модалка). |
| Резолв ссылок | На сервере (`public.navigation.layout`) — вёрстка получает готовое resolved-дерево. |
| Хранение | JSONB в `sites.settings.navigation` (как контакты/SEO/аналитика), не отдельная таблица. |

## Не-цели (вне скоупа)

- **Реестр вёрсток с ключами, рантайм-переключение вида, `settings.layout`, авто-манифест** — переинженерия
  под неверное предположение о мультивидовости в одной инсталляции.
- **Блочный drag-drop конструктор хедера/футера** — оверкилл; вид верстает разработчик.
- **Вложенность > 2 уровней** (пункт → подпункты). Глубже — мегаменю-кейсы, пока YAGNI.
- **Отдельная таблица под навигацию** — JSONB в settings достаточно.
- **Хардкод-дефолт навигации в коде клиента** — данные живут в админке (есть лишь технический фолбэк, см. ниже).

## Архитектура

### A. Контракт данных — `packages/api/src/shared/navigation.ts`

Чистый модуль без node-зависимостей (бандлится и в admin, и в web — как `shared/blocks`, `shared/receivers`).
Источник истины для Zod-схемы, типов и резолва.

```ts
type NavTarget =
  | { kind: "page";     pageId: string }       // → /pages/{slug}, href+title резолвятся
  | { kind: "route";    route: NavRoute }       // системный раздел с фикс. роутом
  | { kind: "category"; categoryId: string }    // → авто-подменю из страниц категории
  | { kind: "url";      href: string; external?: boolean }
  | { kind: "action";   modal: string }         // CTA → открыть модалку (slug из modals)

type NavRoute = "/" | "/projects" | "/news" | "/documents" | "/promotions"

interface NavItem {
  id: string                 // стабильный id (для key/реордера)
  label?: string             // подпись; для page/category опц. — фолбэк на title сущности
  target: NavTarget
  children?: NavItem[]        // выпадашка в хедере (1 уровень вложения)
}

interface FooterColumn {
  id: string
  title?: string
  items: NavItem[]
}

interface SiteNavigation {
  header: NavItem[]
  footer: FooterColumn[]
}
```

- `NavRoute` — закрытый union известных системных роутов (источник правды в коде).
- Zod-схема `siteNavigationSchema` + дефолт `defaultSiteNavigation` (4 текущих пункта в хедере, пустой/
  минимальный футер) — для фолбэка и сидов.
- Поле `navigation?: SiteNavigation` добавляется в `SiteSettings` ([`packages/db/src/schema/sites.ts`](../../../packages/db/src/schema/sites.ts)).
  Опционально → отсутствие трактуется как «не настроено».

### B. Резолв — `public.navigation.layout`

Серверная процедура (зеркалит [`public/contacts.ts`](../../../packages/api/src/routers/public/contacts.ts) `layout`).
Берёт `context.site.settings.navigation` (или `defaultSiteNavigation`, если пусто) и возвращает
**resolved-дерево**, готовое к рендеру:

| `target.kind` | Резолв |
| --- | --- |
| `page` | href `/pages/{slug}`; label-фолбэк на `page.title`; пункт скрывается, если страница не найдена или не `published` |
| `category` | `children` = опубликованные страницы категории (по `title`, т.к. у `pages` нет `sortOrder`), каждая → href+title |
| `route` | href = сам роут |
| `url` | href + `external` как есть |
| `action` | маркер `{ kind: "action", modal }` — вёрстка вешает обработчик открытия модалки |

- Висячие ссылки (удалённая/снятая с публикации страница, удалённая категория) **тихо отфильтровываются**,
  чтобы вёрстка не получала битых пунктов.
- Резолв страниц/категорий — батч-запросом (собрать все `pageId`/`categoryId` из дерева, один `IN`-запрос),
  чтобы не плодить N запросов.
- Тип результата (`ResolvedNavItem` / `ResolvedFooterColumn`) экспортируется из `shared/navigation.ts`
  для типизации вёрстки.

### C. Вёрстка на web — напрямую

`WebHeader.vue` / `WebFooter.vue` остаются обычными компонентами, которые разработчик клиента верстает
под прототип. Источник пунктов меняется: вместо импорта хардкода `useNavigation.ts` —
данные из `public.navigation.layout` (новый composable `useNavigation()` поверх vue-query, по аналогии
с [`useSiteContacts.ts`](../../../apps/web/app/composables/useSiteContacts.ts)).

- **Никакого реестра/ключей/диспетчера.** Один вид на инсталляцию.
- Контакты/соцсети для футера и CTA-телефона берутся как сейчас (`useSiteContacts`).
- `action`-пункты → открытие модалки существующим механизмом.
- Старый `useNavigation.ts` с хардкод-массивом удаляется; вместо него — `useSiteNavigation()` поверх
  `public.navigation.layout` (имя по аналогии с `useSiteContacts`).
- Рефакторенные `WebHeader`/`WebFooter` — это и есть «default-вид» стартера, отправная точка для вёрстки
  под конкретного клиента.

### D. Admin-редактор — `sites/[id]/navigation.vue`

Новая вкладка настроек сайта на `@nuxt/ui` (правило проекта — только готовые компоненты @nuxt/ui).

- **Хедер**: репитер пунктов (`RepeaterField`) с поддержкой вложенности (1 уровень `children`).
- **Футер**: репитер колонок; в каждой — `title` + репитер пунктов.
- **Селектор цели** на пункт: переключатель `kind` + соответствующий ввод:
  - `page` — селект из `pages.list`;
  - `category` — `CategorySelect` (уже есть);
  - `route` — селект из `NavRoute`;
  - `url` — инпут + чекбокс «в новой вкладке»;
  - `action` — селект из `modals` сайта.
- Сохранение — `sites.update` с `settings.navigation` (как делают существующие карточки настроек).
  Помнить про **GOTCHA @nuxt/ui v4**: у `USelect`/reka-ui значения items не должны быть пустой строкой
  (`""` зарезервирована) — для «не выбрано»/сентинелов использовать непустой ключ и маппить в `undefined`.

### E. Совместимость и дубликаты

- **Фолбэк**: если `settings.navigation` пусто — резолвер отдаёт `defaultSiteNavigation` (4 текущих пункта),
  чтобы существующие сайты не остались без меню после релиза. Сид по желанию проставляет дефолт новым сайтам.
- **site-duplication** ([`packages/api/src/services/site-duplication.ts`](../../../packages/api/src/services/site-duplication.ts)):
  при клоне сайта `settings.navigation` копируется с **ремапом `pageId`/`categoryId`** по карте старый→новый id
  — ровно как уже делается для `contactsHeaderIds`/`contactsFooterIds` и ссылок в блоках (`remapBlockReferences`).
  Иначе город-дубль будет ссылаться на страницы/категории сайта-источника (dangling). `route`/`url`/`action`
  ремапа не требуют. Чистая функция ремапа навигации — в `shared/navigation.ts` (тестируемо).

## Объём работ

1. `shared/navigation.ts` — типы, Zod-схема, дефолт, чистый резолв-хелпер + ремап; поле в `SiteSettings`.
2. `public.navigation.layout` — процедура с батч-резолвом и фильтрацией висячих ссылок.
3. Admin: вкладка `sites/[id]/navigation.vue` + селектор цели пункта.
4. Web: composable поверх `public.navigation.layout`; рефактор `WebHeader`/`WebFooter`; удалить хардкод.
5. site-duplication: ремап navigation + фолбэк-дефолт.

## Тестирование

- **Unit** (vitest, чистые функции из `shared/navigation.ts`): Zod-валидация, дефолт, ремап `pageId`/
  `categoryId` (page/category ремапятся, route/url/action — нет).
- **Резолв**: page→href+title, снятая с публикации/удалённая страница отфильтрована, category→подпункты
  в порядке `title`, удалённая категория отфильтрована.
- **E2E через UI** (preview-стек): редактор навигации сохраняет дерево; web рендерит пункты всех 5 типов;
  дубликат города не получает dangling-ссылок.
