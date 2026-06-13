# Оптимизация изображений: imgproxy + @nuxt/image

**Issue:** [#62](https://github.com/alshchetinin/zhk-starter/issues/62)
**Дата:** 2026-06-13
**Статус:** дизайн утверждён, ожидает плана реализации

## TL;DR

Публичный сайт `apps/web` отдаёт картинки голым `<img :src="s3url">` — без ресайза,
без современных форматов, оригиналами из S3. Подключаем self-hosted **imgproxy**
(dev и prod) и единый слой рендера: компонент `<AppImage>` + композабл
`useOptimizedImage()` поверх `@nuxt/image` с кастомным провайдером. Разработчики
выводят изображения **только** через этот слой, не через голый `<img>`.

В БД и в данных блоков ничего не меняется — там по-прежнему лежит полный S3-URL.
Вся оптимизация живёт на слое рендера.

## Контекст (как сейчас)

- **Хранилище:** S3-совместимое (TWC Storage), `public-read`. В БД (`projects.imageUrl`,
  `projects.gallery`, `media.url`) и в данных блоков — **полный публичный URL**:
  `https://s3.twcstorage.ru/37651e87-bureau/{key}`. Конфиг — `packages/api/src/s3.ts`.
- **Рендеринг:** `apps/web/app/components/blocks/renderers/*` используют голый
  `<img :src="url">`. `@nuxt/image` не подключён ни в одном приложении.
- **Инфра:** dev — `packages/db/docker-compose.yml` (postgres:5441, redis:6379);
  prod — Coolify + Traefik. Своего imgproxy/IPX нет.

## Принятые решения

| Вопрос | Решение |
| --- | --- |
| Движок | **imgproxy** (self-hosted, Docker) |
| Безопасность URL | **Без подписи** + жёсткий `IMGPROXY_ALLOWED_SOURCES` на наш бакет (SSRF закрыт) |
| DX | `<AppImage>` (обёртка над `<NuxtImg>`) + `useOptimizedImage()` (строковые URL) |
| Охват | **Только `apps/web`** (admin грузит оригиналы как сейчас) |
| Dev | Локальный imgproxy в docker-compose + флаг `IMG_PROXY_ENABLED` |
| Объём | Миграция **всех** текущих рендереров + генератор + доки — сразу. SEO-обвязка отложена (см. ниже) |

## Архитектура / поток данных

```
БД / данные блока: полный S3-URL
   https://s3.twcstorage.ru/37651e87-bureau/uploads/foo.jpg
        │
        ▼  <AppImage :src="url" :width="800" sizes="(max-width:768px) 100vw, 800px" />
@nuxt/image (default provider: imgproxy)  →  строит URL ресайза
        │
        ▼
imgproxy  {IMG_PROXY_URL}/unsafe/rs:fit:800:0/{base64url(S3-URL)}
   тянет оригинал из S3 (allowlist) → отдаёт WebP/AVIF (по Accept), кэш
        │
        ▼
браузер грузит оптимизированную картинку (srcset под DPR/ширину)
```

Когда `IMG_PROXY_ENABLED=false`, `<AppImage>` отдаёт оригинальный S3-URL без
проксирования (provider `none`) — локальная разработка без поднятого imgproxy
и аварийный фолбэк на проде.

## Компоненты системы

### 1. imgproxy (инфраструктура)

**Dev** — сервис `imgproxy` в `packages/db/docker-compose.yml` рядом с postgres/redis:

- образ `ghcr.io/imgproxy/imgproxy:latest`, порт `8088:8080`;
- запускается вместе с `pnpm db:start` (тот же compose).

**Prod** — отдельный сервис imgproxy в Coolify за Traefik на поддомене
`img.<домен>`. Конфиг Traefik/Coolify живёт в дашборде (в репозитории его нет —
как и для требований к Traefik в `docs/rate-limiting.md`); документируем словами.

**Env imgproxy (одинаково dev/prod):**

| Переменная | Значение | Зачем |
| --- | --- | --- |
| `IMGPROXY_ALLOWED_SOURCES` | `https://s3.twcstorage.ru/37651e87-bureau/` | проксировать только наш бакет — SSRF закрыт |
| `IMGPROXY_AUTO_WEBP` | `true` | WebP по `Accept` |
| `IMGPROXY_AUTO_AVIF` | `true` | AVIF по `Accept` |
| `IMGPROXY_MAX_SRC_RESOLUTION` | напр. `50` (Мп) | защита от бомб-картинок |
| `IMGPROXY_TTL` | напр. `2592000` | `Cache-Control` для CDN |
| `IMGPROXY_KEY` / `IMGPROXY_SALT` | **не задаём** | режим без подписи (unsigned) |

imgproxy ставит `Vary: Accept` — Traefik/CDN-кэш должен это учитывать, иначе
WebP/AVIF и JPEG перемешаются.

> **Замечание по безопасности.** Без подписи любой может запросить произвольный
> размер наших картинок (cache-fill). Источник ограничен allowlist'ом (чужие URL
> нельзя), резолюция — `MAX_SRC_RESOLUTION`. Дополнительно: кэш на Traefik/CDN +
> при желании rate-limit на Traefik для `img.<домен>`. Это осознанный размен на
> простоту провайдера (подпись потребовала бы серверной генерации URL).

### 2. Кастомный провайдер `@nuxt/image`

- `@nuxt/image` подключается **только в `apps/web`** (`modules` в `nuxt.config.ts`).
- `apps/web/providers/imgproxy.ts` — кастомный провайдер:
  - получает полный S3-URL как `src`;
  - маппит модификаторы `@nuxt/image` → processing-опции imgproxy:
    `width`→`rs:fit:{w}:0`, `height`, `fit`, `quality`→`q:{n}`;
  - base64url-кодирует `src` как источник;
  - префиксит `{baseURL}/unsafe/...`, где `baseURL = IMG_PROXY_URL`;
  - формат **не** зашиваем в URL — отдаём content-negotiation imgproxy.
- Регистрируется как **default-провайдер** + провайдер `none` (passthrough) для
  выключенного состояния.
- В плане реализации сперва проверить, нет ли пригодного встроенного/community
  провайдера imgproxy в `@nuxt/image`; если нет — кастомный (как описано).

### 3. `<AppImage>` — основной компонент

`apps/web/app/components/AppImage.vue` — тонкая обёртка над `<NuxtImg>`:

- props: `src` (S3-URL), `alt`, `width`/`height`, `sizes`, `loading`, плюс passthrough;
- проектные дефолты: `fit="cover"` (переопределяемо), `quality` (напр. 80),
  `loading="lazy"`, `decoding="async"`;
- **единственная точка чтения тоггла**: при `runtimeConfig.public.imgProxy.enabled === false`
  рендерит `<NuxtImg provider="none">` (оригинал), иначе `provider="imgproxy"`;
- разработчик пишет один компонент и не думает про окружение.

Контракт: «отдай ресайзнутую `<img>` с `srcset`, alt обязателен». Внутренности
(провайдер, тоггл) меняются без правок в местах использования.

### 4. `useOptimizedImage()` — композабл для строковых URL

`apps/web/app/composables/useOptimizedImage.ts` — для случаев, где нужен **строковый**
URL, а не тег: `og:image`, JSON-LD (`apps/web/app/utils/json-ld.ts`),
`background-image`. Обёртка над `useImage()` из `@nuxt/image` с теми же дефолтами
и тем же тогглом.

```ts
const optimize = useOptimizedImage()
const ogImage = optimize(site.imageUrl, { width: 1200, height: 630 })
```

При выключенном тоггле возвращает исходный URL без изменений.

### 5. Тоггл и env (`apps/web`)

| Переменная | Пример (dev) | Пример (prod) |
| --- | --- | --- |
| `IMG_PROXY_ENABLED` | `true` | `true` |
| `IMG_PROXY_URL` | `http://localhost:8088` | `https://img.<домен>` |

Прокидываются в `runtimeConfig.public.imgProxy` и в опции провайдера в
`apps/web/nuxt.config.ts`. Добавляются в `.env.example`.

## Миграция и сопутствующие правки

### Рендереры блоков

Все `<img>` в `apps/web/app/components/blocks/renderers/*` → `<AppImage>` с
осмысленными `width`/`sizes` под каждый блок. Затронутые (полный список — на этапе
плана): `HeroFullscreenBlock`, `AboutProjectBlock`, `ProjectGalleryBlock`,
`AboutFeaturesBlock`, `AboutCompanyBlock`, `InfrastructureTabsBlock`, `TemasBlock`.
`loading="eager"` / `fetchpriority="high"` для первого экрана (hero, LCP),
`lazy` для остального.

### Генератор блоков

`scripts/generate-block` — stub-renderer для полей `image`/`images` эмитит
`<AppImage>` вместо `<img>`. Idempotency-тесты генератора обновить под новую
эмиссию.

### SEO (отложено)

> На текущей ветке (`feat/62-image-optimization` от `main`) SEO-слоя web ещё нет:
> `usePageSeo()`, `useJsonLd()`, `apps/web/app/utils/json-ld.ts` отсутствуют —
> описаны в `CLAUDE.md`, но не смёрджены (есть только спек
> `2026-06-12-seo-layer-design.md`). Привязывать `og:image`/JSON-LD не к чему.

Поэтому в этой задаче SEO-обвязку **не делаем**, но `useOptimizedImage()` строим
сразу — он станет точкой интеграции, когда SEO-слой смёрджится. Тогда отдельной
правкой: `og:image` (1200×630) и картинки JSON-LD прогоняются через
`useOptimizedImage()`. Зафиксировать как follow-up в issue SEO-слоя.

### Документация

- Новый `docs/images.md` (стиль `tracking.md`/`rate-limiting.md`): TL;DR →
  архитектура → как пользоваться (`<AppImage>` / `useOptimizedImage()`, мандат
  «только так») → инфра imgproxy dev+prod → env → чек-лист для нового блока.
- Корневой `CLAUDE.md` — раздел «Web renderer»: мандат на `<AppImage>` вместо `<img>`.
- `docs/blocks.md` — раздел «после генератора»: дорабатывать рендерер на `<AppImage>`.

## Тестирование / приёмка

- `pnpm build` web проходит, `@nuxt/image` резолвит провайдер.
- Dev: `pnpm db:start` поднимает imgproxy; страница с hero/галереей грузит
  `img.<...>/unsafe/...`, в ответах WebP/AVIF по `Accept`, `srcset` присутствует.
- Тоггл: `IMG_PROXY_ENABLED=false` → грузятся оригиналы S3, ошибок нет.
- imgproxy с чужим URL (не из бакета) → 404/403 (allowlist работает).
- Snapshot-тест генератора (`scripts/generate-block/__tests__/generators.test.ts`)
  обновлён, renderer-stub эмитит `<AppImage>`.
- Unit-тест провайдера (`buildImgproxyUrl`) зелёный: формат
  `{base}/unsafe/rs:fit:W:H/q:Q/{base64url}`.
- Визуальная проверка через preview-инструменты: hero, галерея проекта,
  about-features.

## Вне объёма (YAGNI)

- admin не трогаем (грузит оригиналы);
- без подписи URL, без локального MinIO, без миграции данных в БД;
- без art-direction / `<NuxtPicture>` с явными форматными `<source>` — content
  negotiation imgproxy покрывает; добавляется позже точечно при необходимости.
