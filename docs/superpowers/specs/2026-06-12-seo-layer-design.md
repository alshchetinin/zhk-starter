# SEO-слой: мета-теги, schema.org, sitemap, robots + SEO-настройки сайта

- **Дата:** 2026-06-12
- **Issue:** [#60](https://github.com/alshchetinin/zhk-starter/issues/60)
- **Ветка:** `feat/60-seo-layer`

## Проблема

SEO-поля (`metaTitle`, `metaDescription`, `ogImage`) заполняются в админке у пяти
сущностей (главная, новости, страницы, акции, документы) через `SeoSidebar.vue`
и отдаются публичным API, но на сайте (apps/web) **никуда не выводятся**: ни одного
`useSeoMeta`/`useHead` на страницах, нет og-тегов, canonical, robots.txt,
sitemap.xml, JSON-LD. На уровне сайта (таблица `sites`) SEO-настроек нет вообще.

## Решение

Свой SEO-слой на Nuxt-примитивах (без модулей @nuxtjs/seo) — ключевое ограничение
проекта — мультитенантность по Host (`resolveSiteFromHost`), под которую готовые
модули sitemap/robots не заточены.

### 1. Модель данных — `sites.settings.seo` (JSONB, без миграции)

В `SiteSettings` (packages/db/src/schema/sites.ts) добавляется ключ `seo`
по образцу `analytics`:

```ts
interface SiteSeoSettings {
  titleSuffix?: string;          // « — ЖК Новый Горизонт», добавляется ко всем title
  defaultTitle?: string;         // title главной и фолбэк для страниц без metaTitle
  defaultDescription?: string;   // фолбэк description
  defaultOgImage?: string;       // фолбэк og:image
  favicon?: string;              // favicon сайта (URL загруженного файла)
  indexingEnabled?: boolean;     // default true; false → noindex + robots Disallow
  yandexVerification?: string;   // <meta name="yandex-verification">
  googleVerification?: string;   // <meta name="google-site-verification">
  organization?: {
    name?: string;               // имя застройщика; фолбэк — site.name
    legalName?: string;
    logo?: string;
    contactId?: string;          // источник телефона/адреса; фолбэк — первый контакт футера
  };
}
```

### 2. API (packages/api)

- Zod-схема `seo` в инпуте `sites.update` (рядом с analytics), та же структура.
- `publicSite.status` дополнительно возвращает `seo` — web уже вызывает status
  на каждый запрос (site-gate), новых запросов не появляется.
- Новая процедура `publicSite.sitemap` (rate-limit scope `publicRead`):
  отдаёт для текущего сайта slugs/ids + `updatedAt` опубликованных новостей,
  страниц и проектов.

### 3. Мета-теги на web (apps/web)

Composable **`usePageSeo({ title, description, ogImage, type })`** — обёртка
над `useSeoMeta`:

- title по шаблону `%s + titleSuffix`; фолбэки: meta поля страницы →
  `defaultTitle`/`defaultDescription`/`defaultOgImage` сайта;
- canonical и `og:url` из `useRequestURL()` (мультитенантно по Host);
- `og:site_name` (имя сайта), `og:type`, `og:image` с приведением к
  абсолютному URL, `twitter:card: summary_large_image`;
- `robots: noindex, nofollow` если `indexingEnabled === false`, сайт неактивен
  или под паролем.

Подключается на все 8 публичных страниц (index, news/index, news/[slug],
projects/index, projects/[id], promotions/index, documents/index, [...slug]).
`_preview` — всегда noindex. В layout — верификационные мета-теги и
динамический favicon из настроек.

Резолв итоговых значений (фолбэки) — чистая функция, отделённая от Vue,
для тестируемости.

### 4. JSON-LD (schema.org)

Чистые функции-билдеры + composable `useJsonLd()` (рендер
`<script type="application/ld+json">` через `useHead`):

- **Organization** + **WebSite** — в layout на всех страницах: название,
  `legalName`, логотип, телефон/адрес из выбранного контакта (`PostalAddress`),
  `sameAs` из соцсетей сайта;
- **NewsArticle** — деталь новости: headline, image, datePublished,
  dateModified, publisher (Organization);
- **ApartmentComplex** — деталь проекта: name, address (PostalAddress),
  geo (`GeoCoordinates` из `coordinates`), image (imageUrl/gallery), url;
- **BreadcrumbList** — внутренние страницы (детали новостей/проектов, списки).

Пустые поля опускаются: нет контакта — Organization без telephone/address.

### 5. robots.txt и sitemap.xml — Nitro-роуты (apps/web/server/routes)

Оба резолвят сайт по Host через server-side вызов API:

- **`/robots.txt`**: сайт неактивен / под паролем / `indexingEnabled === false`
  → `Disallow: /`; иначе разрешено всё, кроме `/_preview`,
  плюс `Sitemap: https://<host>/sitemap.xml`;
- **`/sitemap.xml`**: статичные разделы (`/`, `/news`, `/projects`,
  `/promotions`, `/documents`) + динамика из `publicSite.sitemap`
  с `lastmod` из `updatedAt`. Для закрытых от индексации сайтов — пустой
  sitemap (согласован с robots).

### 6. Админка — карточка «SEO» в настройках сайта

Новый `AppDataCard` в `apps/admin/app/pages/sites/[id].vue` (между «Контактами»
и «Метрикой»), только компоненты @nuxt/ui:

- Title по умолчанию, суффикс title, description по умолчанию (textarea);
- OG-картинка по умолчанию (ImageUpload), favicon (ImageUpload);
- switch «Разрешить индексацию» с подсказкой, что сайт под паролем или
  неактивный закрыт от индексации независимо от переключателя;
- верификация Яндекс.Вебмастер / Google Search Console (два input);
- подсекция «Организация (schema.org)»: название, юрназвание,
  логотип (ImageUpload), селект контакта-источника телефона/адреса.

Сохранение — в существующей мутации `sites.update` (settings целиком).

### 7. Тесты (vitest)

- билдеры JSON-LD (полные/частичные данные, опускание пустых полей);
- генерация sitemap XML;
- логика robots (4 состояния: открыт, под паролем, неактивен, индексация выкл);
- чистая функция резолва мета-значений с фолбэками.

## Вне объёма

- Per-page SEO-поля сущностей не меняются — они уже есть и начнут выводиться.
- og:image авто-генерация (nuxt-og-image) — не делаем.
- hreflang, мультиязычность — не делаем.
- Аналитика поисковых запросов, интеграция с Вебмастером — не делаем.
