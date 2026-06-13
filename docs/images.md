# Оптимизация изображений

## TL;DR

Картинки на публичном сайте `apps/web` выводятся **только** через компонент
`<AppImage>` (теги) или композабл `useOptimizedImage()` (строковые URL). Голый
`<img>` в `apps/web` не используем. Под капотом — `@nuxt/image` с кастомным
провайдером, который строит URL для self-hosted **imgproxy**: ресайз + WebP/AVIF
по `Accept`, оригинал тянется из S3 по allowlist.

В БД и в данных блоков лежит полный S3-URL — там ничего не меняется.

## Как пользоваться

### Тег картинки — `<AppImage>`

```vue
<AppImage
  :src="item.image"
  alt="Фасад дома"
  :width="800"
  sizes="(max-width: 768px) 100vw, 33vw"
  loading="lazy"
/>
```

- `src` — полный S3-URL из данных блока/проекта.
- `alt` — обязателен (для декоративных — `alt=""`).
- `width` — целевая ширина (драйвит `srcset`); `sizes` — раскладка под вьюпорты.
- Первый экран (hero, LCP): `loading="eager"` + `:preload="true"`.
- Дефолты: `fit="cover"`, `quality=80`, `loading="lazy"`, `decoding="async"`.

### Строковый URL — `useOptimizedImage()`

Для случаев, где нужен URL-строка, а не тег: `background-image`, `og:image`, JSON-LD.

```ts
const optimize = useOptimizedImage();
const bg = optimize(block.image, { width: 1600 });
// style="`background-image: url(${bg})`"
```

При `IMG_PROXY_ENABLED=false` возвращает исходный URL без изменений.

## Архитектура

```
данные блока: https://s3.twcstorage.ru/37651e87-bureau/uploads/foo.jpg
   → <AppImage :src :width 800 sizes=…/>
   → @nuxt/image (provider imgproxy) строит URL
   → {IMG_PROXY_URL}/unsafe/rs:fill:800:0/q:80/{base64url(S3-URL)}
   → imgproxy тянет оригинал из S3 (allowlist) → WebP/AVIF по Accept, кэш
   → браузер грузит оптимизированную картинку (srcset под DPR/ширину)
```

Слои:
- `apps/web/app/providers/imgproxy-url.ts` — чистый билдер URL (юнит-тест).
- `apps/web/app/providers/imgproxy.ts` — провайдер @nuxt/image.
- `apps/web/app/components/AppImage.vue` — обёртка + единственная точка тоггла.
- `apps/web/app/composables/useOptimizedImage.ts` — строковые URL.
- `apps/web/nuxt.config.ts` — `image.providers.imgproxy` (default) + `runtimeConfig.public.imgProxy`.

## Инфраструктура imgproxy

### Dev

Сервис `imgproxy` в `packages/db/docker-compose.yml`, поднимается вместе с
`pnpm db:start` на `http://localhost:8088`. Тянет оригиналы из облачного S3.

### Prod

Отдельный сервис imgproxy в Coolify за Traefik на поддомене `img.<домен>`.
Конфиг Traefik/Coolify — в дашборде (в репозитории его нет, как и для Traefik в
[rate-limiting](rate-limiting.md)). Env imgproxy одинаков с dev.

### Env imgproxy

| Переменная | Значение | Зачем |
| --- | --- | --- |
| `IMGPROXY_ALLOWED_SOURCES` | `https://s3.twcstorage.ru/37651e87-bureau/` | только наш бакет — SSRF закрыт |
| `IMGPROXY_AUTO_WEBP` / `IMGPROXY_AUTO_AVIF` | `true` | формат по `Accept` |
| `IMGPROXY_MAX_SRC_RESOLUTION` | `50` | защита от бомб-картинок |
| `IMGPROXY_TTL` | `2592000` | `Cache-Control` для CDN |
| `IMGPROXY_KEY` / `IMGPROXY_SALT` | не задаём | режим без подписи |

> imgproxy ставит `Vary: Accept` — кэш Traefik/CDN должен это учитывать.
> URL не подписаны: источник ограничен allowlist'ом, повторы гасит кэш; при
> необходимости добавить rate-limit на Traefik для `img.<домен>`.
>
> AVIF-кодирование заметно нагружает CPU. На проде стоит проверить imgproxy под
> нагрузкой и, если латентность растёт, отключить `IMGPROXY_AUTO_AVIF` (оставив
> WebP) либо выделить ресурсы/масштабировать сервис.

### Env приложения (`apps/web`)

| Переменная | Dev | Prod |
| --- | --- | --- |
| `IMG_PROXY_ENABLED` | `true` (`false` → оригиналы) | `true` |
| `IMG_PROXY_URL` | `http://localhost:8088` | `https://img.<домен>` |

## Чек-лист для нового блока с картинкой

1. В web-рендерере выводить изображение через `<AppImage>` (генератор уже эмитит его в stub).
2. Задать осмысленные `width` и `sizes` под раскладку блока.
3. Первый экран — `loading="eager"` + `:preload="true"`; остальное — `lazy` (дефолт).
4. Для `background-image` / строковых URL — `useOptimizedImage()`.
5. Голый `<img>` в `apps/web` — нельзя.
