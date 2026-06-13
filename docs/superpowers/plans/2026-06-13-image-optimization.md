# Оптимизация изображений (imgproxy + @nuxt/image) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Публичный сайт `apps/web` отдаёт изображения оптимизированными (ресайз + WebP/AVIF) через self-hosted imgproxy; разработчики выводят картинки только через `<AppImage>` / `useOptimizedImage()`.

**Architecture:** В БД лежит полный S3-URL. `@nuxt/image` с кастомным провайдером `imgproxy` строит URL ресайза `{base}/unsafe/rs:fill:W:H/q:Q/{base64url(S3-URL)}`; imgproxy (Docker, dev+prod) тянет оригинал из S3 по allowlist и отдаёт WebP/AVIF по `Accept`. `<AppImage>` — обёртка над `<NuxtImg>` и единственная точка чтения тоггла `IMG_PROXY_ENABLED`; `useOptimizedImage()` — для строковых URL.

**Tech Stack:** Nuxt 4 (apps/web), @nuxt/image, imgproxy (ghcr.io/imgproxy/imgproxy), Docker Compose, Vitest.

**Спек:** `docs/superpowers/specs/2026-06-13-image-optimization-design.md` · **Issue:** [#62](https://github.com/alshchetinin/zhk-starter/issues/62)

**Соглашения окружения этого репо:**
- Nuxt 4, srcDir = `apps/web/app/` → алиас `~` указывает на `apps/web/app`.
- Тест-раннер: `vitest run` (root), `include: apps/**/__tests__/**/*.test.ts`, `packages/**/__tests__/**`, `scripts/**/__tests__/**`. Тесты обязаны лежать в каталоге `__tests__`.
- Команда тестов: `pnpm test` (из корня) = `vitest run`.

---

### Task 1: Установить @nuxt/image и сконфигурировать модуль, провайдер, env

**Files:**
- Modify: `apps/web/package.json:12-24` (dependencies)
- Modify: `apps/web/nuxt.config.ts:9` (modules), `:42-49` (runtimeConfig), новый блок `image`
- Modify: `apps/web/.env`
- Create: `apps/web/.env.example`

- [ ] **Step 1: Добавить зависимость**

В `apps/web/package.json` в `dependencies` (по алфавиту, перед `@orpc/client`) добавить:

```json
    "@nuxt/image": "^1",
```

- [ ] **Step 2: Установить**

Run: `pnpm install`
Expected: установка проходит, `postinstall` (`nuxt prepare`) отрабатывает без ошибок.

- [ ] **Step 3: Подключить модуль и провайдер в nuxt.config.ts**

Заменить строку `modules` (`apps/web/nuxt.config.ts:9`):

```ts
  modules: ["reka-ui/nuxt", "@nuxt/fonts", "@nuxt/icon", "@nuxt/image", "@vueuse/nuxt", "motion-v/nuxt"],
```

Добавить блок `image` сразу после блока `icon: { serverBundle: "local" }` (после `apps/web/nuxt.config.ts:38`):

```ts
  image: {
    provider: "imgproxy",
    providers: {
      imgproxy: {
        name: "imgproxy",
        provider: "~/providers/imgproxy.ts",
        options: {
          baseURL: process.env.IMG_PROXY_URL || "http://localhost:8088",
        },
      },
    },
  },
```

- [ ] **Step 4: Добавить тоггл в runtimeConfig.public**

В `apps/web/nuxt.config.ts`, в `runtimeConfig.public` (после `metrikaDev:` строки `:47`) добавить:

```ts
      imgProxy: {
        enabled: process.env.IMG_PROXY_ENABLED !== "false",
        url: process.env.IMG_PROXY_URL || "http://localhost:8088",
      },
```

- [ ] **Step 5: Прописать env**

В `apps/web/.env` добавить строки:

```
IMG_PROXY_ENABLED=true
IMG_PROXY_URL=http://localhost:8088
```

Создать `apps/web/.env.example` с содержимым:

```
NUXT_PUBLIC_SERVER_URL=http://localhost:3000
NUXT_PUBLIC_METRIKA_DEV=true

# Оптимизация изображений (imgproxy)
# enabled=false → грузятся оригиналы из S3 без ресайза
IMG_PROXY_ENABLED=true
IMG_PROXY_URL=http://localhost:8088
```

- [ ] **Step 6: Проверить, что Nuxt резолвит конфиг**

Run: `pnpm -F zhk-web exec nuxt prepare`
Expected: завершается без ошибок (типы @nuxt/image сгенерированы в `.nuxt`).

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json apps/web/nuxt.config.ts apps/web/.env.example pnpm-lock.yaml
git commit -m "feat(web): подключить @nuxt/image с провайдером imgproxy и тогглом (#62)"
```

---

### Task 2: Чистый билдер URL imgproxy (TDD)

Вынесена чистая логика построения URL — её тестируем юнит-тестом без рантайма Nuxt.

**Files:**
- Create: `apps/web/app/providers/imgproxy-url.ts`
- Test: `apps/web/app/providers/__tests__/imgproxy-url.test.ts`

- [ ] **Step 1: Написать падающий тест**

`apps/web/app/providers/__tests__/imgproxy-url.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { base64Url, buildImgproxyUrl } from "../imgproxy-url";

const SRC = "https://s3.twcstorage.ru/37651e87-bureau/uploads/foo.jpg";
const BASE = "http://localhost:8088";

describe("base64Url", () => {
  it("кодирует url-safe без паддинга", () => {
    const out = base64Url(SRC);
    expect(out).not.toMatch(/[+/=]/);
    expect(out).toBe(
      Buffer.from(SRC, "utf-8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, ""),
    );
  });
});

describe("buildImgproxyUrl", () => {
  it("строит resize(fill) + quality + base64 источник", () => {
    const url = buildImgproxyUrl(SRC, { width: 800, quality: 80 }, BASE);
    expect(url).toBe(`${BASE}/unsafe/rs:fill:800:0/q:80/${base64Url(SRC)}`);
  });

  it("маппит fit=contain → fit и пробрасывает height", () => {
    const url = buildImgproxyUrl(SRC, { width: 400, height: 300, fit: "contain" }, BASE);
    expect(url).toContain("/unsafe/rs:fit:400:300/");
  });

  it("без размеров — только источник", () => {
    expect(buildImgproxyUrl(SRC, {}, BASE)).toBe(`${BASE}/unsafe/${base64Url(SRC)}`);
  });

  it("срезает хвостовой слэш baseURL", () => {
    expect(buildImgproxyUrl(SRC, {}, `${BASE}/`)).toBe(`${BASE}/unsafe/${base64Url(SRC)}`);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pnpm test -- apps/web/app/providers/__tests__/imgproxy-url.test.ts`
Expected: FAIL — `Cannot find module '../imgproxy-url'`.

- [ ] **Step 3: Реализовать билдер**

`apps/web/app/providers/imgproxy-url.ts`:

```ts
// Чистая логика построения URL imgproxy — без рантайма Nuxt, тестируется юнит-тестом.

// fit из @nuxt/image → resize type imgproxy
const FIT_MAP: Record<string, string> = {
  cover: "fill",
  contain: "fit",
  fill: "force",
  inside: "fit",
  outside: "fill",
};

export interface ImgproxyModifiers {
  width?: number | string;
  height?: number | string;
  fit?: string;
  quality?: number | string;
}

export function base64Url(input: string): string {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(input, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildImgproxyUrl(
  src: string,
  modifiers: ImgproxyModifiers = {},
  baseURL = "",
): string {
  const { width, height, fit = "cover", quality } = modifiers;
  const segments: string[] = [];

  if (width || height) {
    const resizeType = FIT_MAP[fit] ?? "fill";
    segments.push(`rs:${resizeType}:${Number(width) || 0}:${Number(height) || 0}`);
  }
  if (quality) {
    segments.push(`q:${Number(quality)}`);
  }

  const processing = segments.join("/");
  const encoded = base64Url(src);
  const tail = processing ? `unsafe/${processing}/${encoded}` : `unsafe/${encoded}`;
  return `${baseURL.replace(/\/$/, "")}/${tail}`;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `pnpm test -- apps/web/app/providers/__tests__/imgproxy-url.test.ts`
Expected: PASS (5 ассертов).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/providers/imgproxy-url.ts apps/web/app/providers/__tests__/imgproxy-url.test.ts
git commit -m "feat(web): чистый билдер URL imgproxy + тесты (#62)"
```

---

### Task 3: Кастомный провайдер @nuxt/image

**Files:**
- Create: `apps/web/app/providers/imgproxy.ts`

- [ ] **Step 1: Реализовать провайдер**

`apps/web/app/providers/imgproxy.ts`:

```ts
import type { ProviderGetImage } from "@nuxt/image";
import { buildImgproxyUrl, type ImgproxyModifiers } from "./imgproxy-url";

export const getImage: ProviderGetImage = (src, { modifiers = {}, baseURL = "" } = {}) => {
  return { url: buildImgproxyUrl(src, modifiers as ImgproxyModifiers, baseURL) };
};
```

- [ ] **Step 2: Проверить сборку конфигурации образа**

Run: `pnpm -F zhk-web exec nuxt prepare`
Expected: без ошибок (провайдер `~/providers/imgproxy.ts` резолвится @nuxt/image).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/providers/imgproxy.ts
git commit -m "feat(web): кастомный провайдер imgproxy для @nuxt/image (#62)"
```

---

### Task 4: Компонент `<AppImage>`

Единственная точка чтения тоггла. Обёртка над `<NuxtImg>`. Авто-импортируется (`components: [{ path: "~/components", pathPrefix: false }]`).

**Files:**
- Create: `apps/web/app/components/AppImage.vue`

- [ ] **Step 1: Реализовать компонент**

`apps/web/app/components/AppImage.vue`:

```vue
<script setup lang="ts">
withDefaults(
  defineProps<{
    src: string;
    alt: string;
    width?: number | string;
    height?: number | string;
    sizes?: string;
    fit?: string;
    quality?: number;
    loading?: "lazy" | "eager";
    preload?: boolean;
  }>(),
  {
    fit: "cover",
    quality: 80,
    loading: "lazy",
  },
);

const config = useRuntimeConfig();
const provider = computed(() => (config.public.imgProxy.enabled ? "imgproxy" : "none"));
</script>

<template>
  <NuxtImg
    :provider="provider"
    :src="src"
    :alt="alt"
    :width="width"
    :height="height"
    :sizes="sizes"
    :fit="fit"
    :quality="quality"
    :loading="loading"
    :preload="preload"
    decoding="async"
  />
</template>
```

- [ ] **Step 2: Проверить типизацию проекта**

Run: `pnpm -F zhk-web exec nuxt prepare && pnpm -F zhk-web exec vue-tsc --noEmit` *(если `vue-tsc` недоступен — пропустить, проверка будет на этапе сборки в Task 10)*
Expected: ошибок по `AppImage.vue` нет.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/components/AppImage.vue
git commit -m "feat(web): компонент AppImage поверх NuxtImg с тогглом (#62)"
```

---

### Task 5: Композабл `useOptimizedImage()`

Для строковых URL (background-image, og:image/JSON-LD — когда смёрджится SEO-слой).

**Files:**
- Create: `apps/web/app/composables/useOptimizedImage.ts`

- [ ] **Step 1: Реализовать композабл**

`apps/web/app/composables/useOptimizedImage.ts`:

```ts
interface OptimizeModifiers {
  width?: number;
  height?: number;
  fit?: string;
  quality?: number;
}

/**
 * Возвращает строковый оптимизированный URL картинки (через imgproxy).
 * Для тегов используйте <AppImage>. Этот композабл — для случаев, где нужен
 * именно строковый URL: background-image, og:image, JSON-LD.
 * При IMG_PROXY_ENABLED=false возвращает исходный URL без изменений.
 */
export function useOptimizedImage() {
  const img = useImage();
  const config = useRuntimeConfig();

  return (src: string | null | undefined, modifiers: OptimizeModifiers = {}): string => {
    if (!src) return "";
    if (!config.public.imgProxy.enabled) return src;
    return img(src, { quality: 80, ...modifiers }, { provider: "imgproxy" });
  };
}
```

- [ ] **Step 2: Проверить prepare**

Run: `pnpm -F zhk-web exec nuxt prepare`
Expected: без ошибок (`useImage` авто-импорт от @nuxt/image).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/composables/useOptimizedImage.ts
git commit -m "feat(web): композабл useOptimizedImage для строковых URL (#62)"
```

---

### Task 6: imgproxy в docker-compose (dev)

**Files:**
- Modify: `packages/db/docker-compose.yml:22-27` (после сервиса `redis`)

- [ ] **Step 1: Добавить сервис imgproxy**

В `packages/db/docker-compose.yml`, после блока `redis` (после строки `:27` `restart: unless-stopped`) и перед `volumes:` добавить:

```yaml
  imgproxy:
    image: ghcr.io/imgproxy/imgproxy:latest
    container_name: zhk-starter-imgproxy
    ports:
      - "8088:8080"
    environment:
      IMGPROXY_ALLOWED_SOURCES: "https://s3.twcstorage.ru/37651e87-bureau/"
      IMGPROXY_AUTO_WEBP: "true"
      IMGPROXY_AUTO_AVIF: "true"
      IMGPROXY_MAX_SRC_RESOLUTION: "50"
      IMGPROXY_TTL: "2592000"
    restart: unless-stopped
```

- [ ] **Step 2: Поднять инфру**

Run: `pnpm db:start`
Expected: контейнеры postgres, redis, imgproxy запущены.

- [ ] **Step 3: Проверить health imgproxy**

Run:
```bash
SRC="https://s3.twcstorage.ru/37651e87-bureau/uploads/foo.jpg"
B64=$(printf '%s' "$SRC" | base64 | tr '+/' '-_' | tr -d '=')
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8088/unsafe/rs:fill:200:0/$B64"
```
Expected: `200` если объект существует, либо `404` если такого ключа нет — главное, **не** `403`/`500` (значит imgproxy жив и allowlist пропускает наш бакет). Для надёжной проверки подставить реально существующий ключ из бакета.

- [ ] **Step 4: Проверить, что allowlist режет чужой источник**

Run:
```bash
EVIL="https://example.com/x.jpg"
B64E=$(printf '%s' "$EVIL" | base64 | tr '+/' '-_' | tr -d '=')
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8088/unsafe/rs:fill:200:0/$B64E"
```
Expected: `403` (источник вне allowlist — SSRF закрыт).

- [ ] **Step 5: Commit**

```bash
git add packages/db/docker-compose.yml
git commit -m "feat(db): сервис imgproxy в docker-compose для dev (#62)"
```

---

### Task 7: Миграция рендереров на `<AppImage>`

8 файлов. В каждом — точечная замена `<img>` (или `<Motion as=\"img\">`) на `<AppImage>` с осмысленными `width`/`sizes`. Fallback-блоки (`v-else` с `<Icon>` или плейсхолдером) **не трогаем** — `v-if` на исходном элементе сохраняем.

**Files:**
- Modify: `apps/web/app/components/blocks/renderers/HeroFullscreenBlock.vue:43-50`
- Modify: `apps/web/app/components/blocks/renderers/ProjectGalleryBlock.vue:49-58`
- Modify: `apps/web/app/components/blocks/renderers/AboutProjectBlock.vue:61-66`
- Modify: `apps/web/app/components/blocks/renderers/AboutFeaturesBlock.vue:39-45`
- Modify: `apps/web/app/components/blocks/renderers/AboutCompanyBlock.vue:19-26`
- Modify: `apps/web/app/components/blocks/renderers/InfrastructureTabsBlock.vue:49-54`
- Modify: `apps/web/app/components/blocks/renderers/TemasBlock.vue:34`
- Modify: `apps/web/app/components/blocks/renderers/ProjectInfrastructureBlock.vue:141`

- [ ] **Step 1: HeroFullscreenBlock** — заменить блок `<img …/>` (строки 43-50) на:

```vue
        <AppImage
          v-for="(src, i) in images"
          v-show="i === currentSlide"
          :key="src"
          :src="src"
          :alt="title"
          :width="1920"
          sizes="100vw"
          :loading="i === 0 ? 'eager' : 'lazy'"
          :preload="i === 0"
          class="hero__bg-img"
        />
```

- [ ] **Step 2: ProjectGalleryBlock** — заменить `<Motion as="img" …/>` (строки 49-58) на Motion-обёртку с AppImage внутри:

```vue
        <Motion
          as="div"
          v-for="(src, i) in images"
          :key="i"
          :variants="staggerChild"
          class="aspect-[4/3] w-full overflow-hidden rounded-lg"
        >
          <AppImage
            :src="src"
            :alt="`${project.name} — ${i + 1}`"
            :width="800"
            sizes="(max-width: 768px) 100vw, 33vw"
            :loading="i > 0 ? 'lazy' : 'eager'"
            class="size-full object-cover"
          />
        </Motion>
```

- [ ] **Step 3: AboutProjectBlock** — заменить `<img …/>` (строки 61-66) на:

```vue
              <AppImage
                :key="`${activeTab}-${currentSlide}`"
                :src="activeTabData.images[currentSlide]"
                :alt="activeTabData.title"
                :width="1280"
                sizes="(max-width: 1024px) 100vw, 66vw"
                class="absolute inset-0 size-full object-cover"
              />
```

- [ ] **Step 4: AboutFeaturesBlock** — заменить `<img …/>` (строки 39-45) на:

```vue
              <AppImage
                v-if="item.image"
                :src="item.image"
                :alt="item.title"
                :width="600"
                sizes="(max-width: 768px) 100vw, 33vw"
                :loading="i > 0 ? 'lazy' : 'eager'"
                class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
```

- [ ] **Step 5: AboutCompanyBlock** — заменить `<img …/>` (строки 19-26) на:

```vue
        <AppImage
          v-if="image"
          :src="image"
          :alt="title"
          :width="800"
          sizes="(max-width: 1024px) 100vw, 50vw"
          class="h-full w-full object-cover"
        />
```

- [ ] **Step 6: InfrastructureTabsBlock** — заменить `<img …/>` (строки 49-54) на:

```vue
                <AppImage
                  v-if="activeTabData.image"
                  :src="activeTabData.image"
                  :alt="activeTabData.title"
                  :width="800"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  class="size-full min-h-80 object-cover"
                />
```

- [ ] **Step 7: TemasBlock** — заменить `<img …/>` (строка 34) на:

```vue
              <AppImage :src="item.avatar" :alt="item.name" :width="400" sizes="(max-width: 768px) 50vw, 25vw" :loading="i > 0 ? 'lazy' : 'eager'" class="aspect-[4/3] w-full object-cover" />
```

- [ ] **Step 8: ProjectInfrastructureBlock** — заменить `<img v-else …/>` (строка 141) на (маленькая иконка категории; `alt=""` — декоративная; SVG-иконки imgproxy пропускает/растрирует, на 32px приемлемо):

```vue
          <AppImage v-else :src="cat.icon" alt="" :width="32" class="size-4" />
```

- [ ] **Step 9: Убедиться, что голых `<img>` в рендерерах не осталось**

Run: `grep -rn "<img\|as=\"img\"" apps/web/app/components/blocks/renderers/`
Expected: пусто (ни одного совпадения).

- [ ] **Step 10: Прогнать prepare/типы**

Run: `pnpm -F zhk-web exec nuxt prepare`
Expected: без ошибок.

- [ ] **Step 11: Commit**

```bash
git add apps/web/app/components/blocks/renderers/
git commit -m "refactor(web): перевести все рендереры блоков на AppImage (#62)"
```

---

### Task 8: Генератор блоков — stub эмитит `<AppImage>` (TDD)

Чтобы новые блоки сразу создавались с `<AppImage>`, а не голым `<img>`.

**Files:**
- Modify: `scripts/generate-block/generators/web-renderer.ts:73-80`
- Modify: `scripts/generate-block/__tests__/generators.test.ts:173-176`

- [ ] **Step 1: Дописать ассерт в тест (падающий)**

В `scripts/generate-block/__tests__/generators.test.ts`, тест `renderer: snapshot` (строки 173-176) заменить на:

```ts
  it("renderer: snapshot + AppImage для image-полей", () => {
    generateWebRenderer(root, BLOCK);
    const renderer = read("apps/web/app/components/blocks/renderers/TestCardsBlock.vue");
    expect(renderer).toMatchSnapshot();
    expect(renderer).toContain("<AppImage");
    expect(renderer).not.toContain("<img ");
  });
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pnpm test -- scripts/generate-block/__tests__/generators.test.ts -t "AppImage"`
Expected: FAIL — `expect(renderer).toContain("<AppImage")` не выполнен (сейчас эмитится `<img`).

- [ ] **Step 3: Поправить эмиссию в генераторе**

В `scripts/generate-block/generators/web-renderer.ts`, в ветке `repeaterHasImage` (строки 73-80) заменить строку с `<img` (строка 76) на `<AppImage`:

```ts
      templateLines.push(
        `          <UiCard hoverable>`,
        `            <template #header>`,
        `              <AppImage :src="item.${imageField.name}" :alt="item.${titleField?.name ?? imageField.name}" :width="600" sizes="(max-width: 768px) 100vw, 33vw" :loading="i > 0 ? 'lazy' : 'eager'" class="aspect-[4/3] w-full object-cover" />`,
        `            </template>`,
        `            <!-- TODO: рендеринг содержимого карточки -->`,
        `            <pre class="text-sm">{{ item }}</pre>`,
        `          </UiCard>`,
      );
```

- [ ] **Step 4: Обновить снапшот и прогнать тест**

Run: `pnpm test -- scripts/generate-block/__tests__/generators.test.ts -u`
Expected: PASS, снапшот `__snapshots__/generators.test.ts.snap` обновлён (содержит `<AppImage`).

- [ ] **Step 5: Прогнать весь набор тестов**

Run: `pnpm test`
Expected: все тесты зелёные (включая round-trip определений блоков и unit провайдера).

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-block/generators/web-renderer.ts scripts/generate-block/__tests__/
git commit -m "feat(generator): stub рендерера эмитит AppImage вместо img (#62)"
```

---

### Task 9: Документация

**Files:**
- Create: `docs/images.md`
- Modify: `CLAUDE.md` (раздел «### Web renderer»)
- Modify: `docs/blocks.md` (раздел про доработку рендерера после генератора)

- [ ] **Step 1: Создать `docs/images.md`**

```markdown
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
```

- [ ] **Step 2: Дополнить `CLAUDE.md` — раздел «### Web renderer»**

Найти список в разделе `### Web renderer` (после строки `- Richtext: \`v-html\` + \`class="prose-web"\``) и добавить пункт:

```markdown
- Изображения: **только** `<AppImage>` (обёртка над `<NuxtImg>`/imgproxy), не голый `<img>`. Строковые URL (og/background-image) — `useOptimizedImage()`. См. [docs/images.md](docs/images.md)
```

- [ ] **Step 3: Дополнить `docs/blocks.md`**

Найти раздел про доработку web-рендерера после генератора (заголовок «После генератора — доработать web renderer») и добавить в конец абзаца:

```markdown
Изображения выводи через `<AppImage>` (генератор уже эмитит его для полей `image`/`images`), не через голый `<img>` — см. [images.md](images.md).
```

- [ ] **Step 4: Commit**

```bash
git add docs/images.md CLAUDE.md docs/blocks.md
git commit -m "docs(images): руководство по AppImage/imgproxy + мандат в CLAUDE/blocks (#62)"
```

---

### Task 10: Сквозная проверка и финал

**Files:** —

- [ ] **Step 1: Полная сборка web**

Run: `pnpm -F zhk-web build`
Expected: сборка проходит, @nuxt/image и провайдер резолвятся, ошибок нет.

- [ ] **Step 2: Поднять инфру и dev-сервер web**

Run: `pnpm db:start` (если не запущено) и запустить web через preview-инструменты (`preview_start`, dev-сервер на :3001).

- [ ] **Step 3: Проверить оптимизацию в браузере**

Через preview-инструменты открыть страницу с hero/галереей. Проверить:
- `preview_network` — запросы картинок идут на `localhost:8088/unsafe/...`, `content-type: image/webp` или `image/avif`;
- `preview_snapshot` — у `<img>` присутствует `srcset`;
- `preview_screenshot` — картинки отображаются корректно (не битые).

- [ ] **Step 4: Проверить тоггл-фолбэк**

Временно выставить `IMG_PROXY_ENABLED=false` в `apps/web/.env`, перезапустить dev-сервер, открыть ту же страницу. Ожидается: картинки грузятся напрямую с `s3.twcstorage.ru` (без `localhost:8088`), ошибок нет. Вернуть `IMG_PROXY_ENABLED=true`.

- [ ] **Step 5: Прогнать тесты**

Run: `pnpm test`
Expected: все зелёные.

- [ ] **Step 6: Обновить issue**

```bash
gh issue comment 62 --body "Реализация завершена: @nuxt/image + провайдер imgproxy, AppImage + useOptimizedImage, imgproxy в docker-compose, все рендереры переведены, генератор обновлён, docs/images.md. Сборка/тесты зелёные, оптимизация и тоггл проверены в браузере."
```

- [ ] **Step 7: Финальная проверка ветки и завершение**

Run: `git log --oneline main..HEAD`
Expected: коммиты Task 1-9 на месте. Дальше — через skill `superpowers:finishing-a-development-branch` (PR / merge).

---

## Самопроверка плана

**Покрытие спека:**
- imgproxy dev (docker-compose) → Task 6; prod (Coolify/Traefik) → задокументировано в Task 9 (`docs/images.md`).
- Без подписи + allowlist → Task 6 (env + проверка 403 на чужой источник).
- Кастомный провайдер → Task 2-3; default-провайдер + `none` → Task 1 (config) + Task 4 (переключение в AppImage).
- `<AppImage>` (точка тоггла) → Task 4; `useOptimizedImage()` → Task 5.
- Тоггл `IMG_PROXY_ENABLED` / env → Task 1 + проверка Task 10 Step 4.
- Охват только web → @nuxt/image подключается лишь в `apps/web` (Task 1); admin не трогается.
- Миграция всех рендереров → Task 7 (8 файлов, grep-проверка отсутствия `<img>`).
- Генератор → Task 8 (TDD + снапшот).
- Доки (images.md, CLAUDE.md, blocks.md) → Task 9.
- SEO-обвязка — **сознательно вне объёма** (SEO-слой не смёрджен; зафиксировано в спеке как follow-up).

**Согласованность типов:** `buildImgproxyUrl(src, modifiers, baseURL)` и `base64Url(input)` — одна сигнатура в Task 2 (определение), Task 2 (тест), Task 3 (провайдер). `ImgproxyModifiers` экспортируется из `imgproxy-url.ts` и импортируется в провайдере. `useRuntimeConfig().public.imgProxy.enabled` — одно имя в nuxt.config (Task 1), AppImage (Task 4), useOptimizedImage (Task 5).

**Плейсхолдеры:** в шагах с кодом приведён полный код; «TODO» в генераторе — это намеренная часть stub-шаблона генератора (не плейсхолдер плана).
