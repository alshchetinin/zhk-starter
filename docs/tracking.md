# Трекинг событий и аналитика

Сайты управляются мульти-сайтово. Каждому сайту в админке (`/sites/[id]`) можно
задать счётчик Яндекс.Метрики и набор опций (вебвизор, карта кликов и т.д.).
В коде есть универсальный bus событий — `useTracking()` — через который любой
компонент сайта стреляет бизнес-событиями (отправка формы, клик по телефону
и т.п.). Bus прозрачно рассылает событие во все включённые провайдеры
аналитики; провайдер сам решает, нужен ли ему этот сайт (есть ли настройки).

## TL;DR

```ts
// в любом .vue компоненте apps/web
const { trackFormSubmit, trackPhoneClick, trackMessengerClick, track } = useTracking();

// шорткаты для частых событий
trackFormSubmit("callback");
trackPhoneClick("+7 999 ...");
trackMessengerClick("whatsapp");

// или универсальный track — TS подскажет имя из реестра
track("form_submit", { form: "callback" });
```

В dev все вызовы логируются в консоль:
`[tracking] form_submit — Отправка формы заявки { form: 'callback' }`.

## Где живёт что

| Файл | Что |
|---|---|
| `packages/api/src/shared/tracking.ts` | **Реестр событий** — единственный источник правды |
| `apps/web/app/composables/useTracking.ts` | bus `useTracking()` — `track(event, params)` + шорткаты |
| `apps/web/app/utils/tracking-providers.ts` | Список провайдеров и их `send()` |
| `apps/web/app/plugins/yandex-metrika.ts` | Загрузка SDK Метрики + SPA hits |
| `apps/web/app/composables/useSiteGate.ts` | Откуда `track()` берёт `counterId` (приходит из `public.site.status`) |
| `apps/admin/app/pages/sites/[id].vue` | UI настроек Метрики per-site + автогенерация таблицы целей |

## Добавить новое событие — 1 шаг

В `packages/api/src/shared/tracking.ts` добавить запись в `TRACKING_EVENTS`:

```ts
export const TRACKING_EVENTS = {
  // ...
  apartment_view: {
    title: "Просмотр квартиры",
    description: "Открытие модалки или страницы квартиры в каталоге",
    category: "engagement",
  },
} as const satisfies Record<string, TrackingEventMeta>;
```

Что произойдёт автоматически:

- В `track()` появится новый ключ с автокомплитом и type-check.
- В админке `/sites/[id]` в таблице «События для целей в Метрике» сразу
  появится новая строка в нужной категории.
- В dev-консоли вызов `track('apartment_view', ...)` будет печататься
  с заголовком из `title`.

После этого в коде вызвать в нужной точке:

```ts
const { track } = useTracking();
track("apartment_view", { id: apartment.id, layout: layoutCode });
```

И сообщить клиенту, что в кабинете Метрики нужно создать цель типа
**JavaScript-событие** с условием совпадения по имени `apartment_view`.

## Добавить часто используемое событие как шорткат

Если событие вызывается из многих мест и удобнее не передавать каждый раз
имя — добавьте метод в `useTracking()` как тонкую обёртку над `track`:

```ts
return {
  track,
  trackFormSubmit: (form?: string) => track("form_submit", form ? { form } : undefined),
  trackApartmentView: (id: string, layout?: string) =>
    track("apartment_view", { id, ...(layout ? { layout } : {}) }),
};
```

Шорткаты — sugar, не источник правды. Можно обходиться одним `track()`.

## Куда вызывать события

**Главное правило: ищите централизованную точку.** Если форма заявки уже
открывается через `ModalProvider`, не разбрасывайте `trackFormSubmit` по
блокам — поставьте один вызов в успехе сабмита `ModalProvider.vue`. То же
для tel:/мессенджер ссылок: `WebHeader`, `WebFooter`, `ContactsBlock` —
точки, где живут эти ссылки. Не заводите трекинг в каждом блоке-обёртке.

Если внутри блока есть собственное действие (открытие модалки,
переход на подзапись, скачивание PDF) — вызывайте `track` прямо в
обработчике этого действия в renderer'е блока.

## Добавить нового провайдера аналитики

Сейчас работает только Яндекс.Метрика. Чтобы подключить ещё один сервис
(GA4, GTM, Top.Mail.Ru, кастомный пиксель):

1. **Расширьте схему** `SiteSettings.analytics` в
   `packages/db/src/schema/sites.ts` — добавьте поле для нового провайдера
   (например, `googleAnalytics: { measurementId: string }`).
2. **Расширьте Zod-схему** `analyticsSchema` в
   `packages/api/src/routers/sites.ts` — добавьте валидацию ID.
3. **Реализуйте `TrackingProvider`** в `apps/web/app/utils/tracking-providers.ts`:

   ```ts
   const googleAnalyticsProvider: TrackingProvider = {
     name: "google-analytics",
     send(gate, event, params) {
       const measurementId = gate?.analytics?.googleAnalytics?.measurementId;
       if (!measurementId) return;
       if (typeof window === "undefined" || typeof window.gtag !== "function") return;
       window.gtag("event", event, params ?? {});
     },
   };

   export const TRACKING_PROVIDERS: TrackingProvider[] = [
     yandexMetrikaProvider,
     googleAnalyticsProvider,
   ];
   ```

4. **Создайте плагин** для загрузки SDK в `apps/web/app/plugins/<provider>.ts`
   по аналогии с `yandex-metrika.ts` — он инжектит script-теги через
   `useHead` и устанавливает `window.gtag` (или эквивалент).
5. **Добавьте карточку настроек** в `apps/admin/app/pages/sites/[id].vue`
   рядом с карточкой Метрики.

Bus и блоки трогать не нужно — `track()` пробежит по `TRACKING_PROVIDERS`
и каждому передаст событие. Провайдер сам решит, нужно ли ему отправлять
(если ID не задан — `send()` молча выходит).

## Тестирование в dev

По умолчанию Метрика в dev **не загружается** (чтобы не засорять статистику
тестовыми хитами), но `track()` всегда логирует событие в консоль —
видно срабатывание целей без подключения счётчика.

Чтобы включить полноценную загрузку SDK Метрики в dev:

```bash
NUXT_PUBLIC_METRIKA_DEV=true pnpm dev:web
```

или в `.env`:
```
NUXT_PUBLIC_METRIKA_DEV=true
```

В кабинете Метрики нужно либо добавить `localhost` как разрешённый домен,
либо открывать страницу с `?_ym_debug=1` для отладочного режима.

## Когда событие НЕ срабатывает

- Сайт неактивен (`gate.status !== 'active'`).
- В `Site.settings.analytics.yandexMetrika.counterId` пусто.
- Сборка production, но `gate` не успел прорезолвиться (до загрузки плагина
  `site-gate`) — Метрика ждёт `dependsOn: ['site-gate']`.
- В dev — без `NUXT_PUBLIC_METRIKA_DEV=true` SDK не грузится; но dev-логи
  в консоли будут.

## Что не делаем намеренно

- Виртуальные страницы (`hit` для модалок) — будем добавлять при работе
  над каталогом квартир и отдельных модалок.
- Cookie-consent — Метрика в РФ грузится без opt-in.
- Custom HTML / произвольные `<script>` per-site — отдельная задача
  с обсуждением безопасности (можно сломать сайт чужим JS).
- Deep merge `settings.analytics` в oRPC `update` — пока в `analytics`
  только `yandexMetrika`, простой spread достаточен. Когда появится второй
  провайдер — нужно будет глубокий merge или отдельная процедура
  `updateAnalytics`.
