# Alt-теги для изображений — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать редактору задавать `alt` для всех картинок (центральный baseline на файл + per-usage override в блоках) и выводить его в `<AppImage>` на сайте.

**Architecture:** Центральный `alt` хранится в `media.alt` (по `url`), редактируется в общих загрузчиках, доставляется на web картой URL→alt. `AppImage` делается union-aware (`src: string | {url, alt?}`) и резолвит итоговый alt по цепочке `per-usage → central → переданный alt → ""`. Per-usage override (Фаза 2) — union-значение image-полей блоков.

**Tech Stack:** oRPC + Zod (`packages/api`), Drizzle (`packages/db`), Nuxt 4 web (vue-query, `@nuxt/image`), Nuxt 4 admin (`@nuxt/ui`, vue-query), Vitest.

**Issue:** [#66](https://github.com/alshchetinin/zhk-starter/issues/66) · **Spec:** `docs/superpowers/specs/2026-06-15-image-alt-tags-design.md` · **Ветка:** `feat/66-image-alt-tags` (уже активна)

**Команды проверки:** `pnpm test` (Vitest), `pnpm check-types` (TS; Vue SFC **не** тайпчекаются — Vue-слой проверяем в preview).

---

## File Structure

**Фаза 1 — центральный alt + вывод (покрывает все картинки):**
- `packages/api/src/routers/media.ts` — +`update`, +`altMap` процедуры.
- `apps/web/app/utils/image-value.ts` *(новый)* — чистые хелперы `imageUrl`/`resolveImageAlt` + тип `ImageValue`.
- `apps/web/app/composables/useImageAlt.ts` *(новый)* — `useAltMap` (useState) + `useImageAlt`.
- `apps/web/app/plugins/alt-map.ts` *(новый)* — одноразовая загрузка карты в state.
- `apps/web/app/components/AppImage.vue` — union-aware `src`, резолв alt.
- `apps/admin/app/types/image.ts` *(новый)* — тип `ImageValue` (зеркало web).
- `apps/admin/app/components/ImageUpload.vue` — alt-инпут + подсказка + запись central/per-usage.
- `apps/admin/app/components/GalleryUpload.vue` — alt-инпут на элемент.
- `apps/admin/app/types/gallery.ts` — `GalleryItem.alt`.

**Фаза 2 — per-usage override в блоках:**
- `packages/api/src/shared/blocks/_core.ts` — +`imageValue`/`imagesValue` Zod-хелперы.
- `scripts/generate-block/field-types.ts` — `image`/`images` эмитят хелперы.
- `scripts/generate-block/generators/block-definition.ts` — импорт хелперов в эмиссии.
- `packages/api/src/shared/blocks/{about-company,about-features,about-project,hero-fullscreen,infrastructure-tabs,temas}.ts` — dataSchema под union + импорт.
- `packages/api/src/shared/blocks/__tests__/blocks.test.ts` — допустить union в проверке image-полей.
- `apps/web/app/components/blocks/renderers/*.vue` — аудит «сырых» строковых операций над значением (ключи `:key`, вычисления).

---

## ФАЗА 1

### Task 1: Чистые хелперы значения картинки (web)

**Files:**
- Create: `apps/web/app/utils/image-value.ts`
- Test: `apps/web/app/utils/__tests__/image-value.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// apps/web/app/utils/__tests__/image-value.test.ts
import { describe, it, expect } from "vitest";
import { imageUrl, resolveImageAlt } from "../image-value";

describe("imageUrl", () => {
  it("строка возвращается как есть", () => {
    expect(imageUrl("https://s3/x.jpg")).toBe("https://s3/x.jpg");
  });
  it("из объекта берётся url", () => {
    expect(imageUrl({ url: "https://s3/x.jpg", alt: "Фасад" })).toBe("https://s3/x.jpg");
  });
  it("null/undefined → пустая строка", () => {
    expect(imageUrl(null)).toBe("");
    expect(imageUrl(undefined)).toBe("");
  });
});

describe("resolveImageAlt (приоритет per-usage → central → fallback → '')", () => {
  it("per-usage alt из объекта побеждает", () => {
    expect(resolveImageAlt({ url: "u", alt: "Из блока" }, "Центральный", "Заголовок")).toBe("Из блока");
  });
  it("при пустом per-usage берётся central", () => {
    expect(resolveImageAlt({ url: "u", alt: "" }, "Центральный", "Заголовок")).toBe("Центральный");
    expect(resolveImageAlt("u", "Центральный", "Заголовок")).toBe("Центральный");
  });
  it("при пустом central берётся fallback рендерера", () => {
    expect(resolveImageAlt("u", null, "Заголовок")).toBe("Заголовок");
  });
  it("ничего нет → пустая строка (декоративная)", () => {
    expect(resolveImageAlt("u", null, "")).toBe("");
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm vitest run apps/web/app/utils/__tests__/image-value.test.ts`
Expected: FAIL — `Cannot find module '../image-value'`.

- [ ] **Step 3: Минимальная реализация**

```ts
// apps/web/app/utils/image-value.ts
export type ImageValue = string | { url: string; alt?: string | null };

export function imageUrl(value: ImageValue | null | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.url;
}

/** per-usage alt объекта → central (по url) → fallback рендерера → "" */
export function resolveImageAlt(
  value: ImageValue | null | undefined,
  centralAlt: string | null | undefined,
  fallback: string,
): string {
  const perUsage = value && typeof value === "object" ? value.alt : null;
  return (perUsage || centralAlt || fallback || "").trim();
}
```

- [ ] **Step 4: Запустить — убедиться, что зелёный**

Run: `pnpm vitest run apps/web/app/utils/__tests__/image-value.test.ts`
Expected: PASS (8 assertions).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/utils/image-value.ts apps/web/app/utils/__tests__/image-value.test.ts
git commit -m "feat(web): чистые хелперы imageUrl/resolveImageAlt для alt-тегов (#66)"
```

---

### Task 2: API — `media.update` и `media.altMap`

**Files:**
- Modify: `packages/api/src/routers/media.ts`

Контекст: `media` уже импортируется; `protectedProcedure` уже импортирован из `../index`; `publicProcedure` тоже экспортируется из `../index` ([index.ts:6](../../../packages/api/src/index.ts)). Паттерн rate-limit для публичного чтения — `.use(rateLimit("publicRead", { keyBy: "ip" }))` (см. `public/contacts.ts`).

- [ ] **Step 1: Добавить импорты**

В шапке `media.ts` расширить импорты drizzle и добавить `publicProcedure` + `rateLimit`:

```ts
import { and, count, eq, like, ilike, isNotNull, ne } from "drizzle-orm";
import { protectedProcedure, publicProcedure } from "../index";
import { rateLimit } from "../middleware/rate-limit";
```

- [ ] **Step 2: Добавить процедуру `update` (central alt по url)**

Внутри `mediaRouter`, после `list`:

```ts
  update: protectedProcedure
    .input(z.object({ url: z.string().url(), alt: z.string().max(500) }))
    .handler(async ({ input }) => {
      // url де-факто уникален (key содержит uuid). Пустой alt → null.
      await db
        .update(media)
        .set({ alt: input.alt.trim() || null })
        .where(eq(media.url, input.url));
      return { success: true };
    }),
```

- [ ] **Step 3: Добавить процедуру `altMap` (публичная, карта url→alt)**

```ts
  altMap: publicProcedure
    .use(rateLimit("publicRead", { keyBy: "ip" }))
    .handler(async () => {
      const rows = await db
        .select({ url: media.url, alt: media.alt })
        .from(media)
        .where(and(isNotNull(media.alt), ne(media.alt, "")));
      const map: Record<string, string> = {};
      for (const r of rows) if (r.alt) map[r.url] = r.alt;
      return map;
    }),
```

- [ ] **Step 4: Проверить типы**

Run: `pnpm check-types`
Expected: PASS (нет ошибок в `packages/api`).

- [ ] **Step 5: Проверить вручную через работающий сервер**

Поднять сервер (`pnpm dev` или существующий) и проверить публичную ручку:

Run: `curl -s -X POST localhost:3000/rpc/media/altMap -H 'content-type: application/json' -d '{}' | head -c 200`
Expected: JSON-объект `{}` или `{"<url>":"<alt>"}` (200, без ошибки авторизации).

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routers/media.ts
git commit -m "feat(api): media.update (central alt по url) + media.altMap (#66)"
```

---

### Task 3: Web — composable `useImageAlt` + плагин загрузки карты

**Files:**
- Create: `apps/web/app/composables/useImageAlt.ts`
- Create: `apps/web/app/plugins/alt-map.ts`

Контекст: образец одноразовой загрузки данных сайта в плагине — `apps/web/app/plugins/site-gate.ts` (`dependsOn: ["orpc"]`, `$orpcClient.public...`). Образец state-композабла — `useSiteGate` (`useState`).

- [ ] **Step 1: composable**

```ts
// apps/web/app/composables/useImageAlt.ts
export function useAltMap() {
  return useState<Record<string, string>>("alt-map", () => ({}));
}

/** Центральный alt для url (или undefined). url может быть ref/getter. */
export function useImageAlt(url: MaybeRefOrGetter<string>) {
  const map = useAltMap();
  return computed(() => {
    const key = toValue(url);
    return key ? map.value[key] : undefined;
  });
}
```

- [ ] **Step 2: плагин (одноразовая загрузка карты)**

```ts
// apps/web/app/plugins/alt-map.ts
export default defineNuxtPlugin({
  name: "alt-map",
  dependsOn: ["orpc"],
  async setup() {
    const { $orpcClient } = useNuxtApp();
    const map = useAltMap();
    if (Object.keys(map.value).length) return;
    try {
      map.value = await $orpcClient.media.altMap();
    } catch {
      // fail-soft: без карты alt деградирует к fallback рендерера
      map.value = {};
    }
  },
});
```

- [ ] **Step 3: Проверить, что web собирается**

Run: `pnpm check-types`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/composables/useImageAlt.ts apps/web/app/plugins/alt-map.ts
git commit -m "feat(web): useImageAlt + плагин загрузки карты alt (#66)"
```

---

### Task 4: Web — union-aware `AppImage`

**Files:**
- Modify: `apps/web/app/components/AppImage.vue`

- [ ] **Step 1: Переписать `<script setup>`**

`src` принимает union; `alt` становится fallback'ом; итоговые `url`/`resolvedAlt` вычисляются.

```vue
<script setup lang="ts">
import { imageUrl, resolveImageAlt, type ImageValue } from "~/utils/image-value";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    src: ImageValue;
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
const enabled = computed(() => config.public.imgProxy.enabled);

const url = computed(() => imageUrl(props.src));
const central = useImageAlt(url);
const resolvedAlt = computed(() => resolveImageAlt(props.src, central.value, props.alt));
</script>
```

- [ ] **Step 2: Обновить шаблон — использовать `url` и `resolvedAlt`**

В обеих ветках (`<NuxtImg>` и `<img>`) заменить `:src="src"` → `:src="url"` и `:alt="alt"` → `:alt="resolvedAlt"`:

```vue
<template>
  <NuxtImg
    v-if="enabled"
    provider="imgproxy"
    :src="url"
    :alt="resolvedAlt"
    :width="width"
    :height="height"
    :sizes="sizes"
    :fit="fit"
    :quality="quality"
    :loading="loading"
    :preload="preload"
    decoding="async"
    v-bind="$attrs"
  />
  <img
    v-else
    :src="url"
    :alt="resolvedAlt"
    :width="width"
    :height="height"
    :loading="loading"
    decoding="async"
    v-bind="$attrs"
  />
</template>
```

- [ ] **Step 3: Проверить в preview, что вывод не сломан**

Поднять web preview (`preview_start`), открыть страницу с картинками, `preview_snapshot` / `preview_console_logs` — изображения рендерятся, в DOM есть `alt` (для строкового `src` — fallback рендерера, т.к. central пока пуст). Ошибок в консоли нет.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/AppImage.vue
git commit -m "feat(web): union-aware AppImage с резолвом alt по цепочке (#66)"
```

---

### Task 5: Admin — alt-инпут в `ImageUpload`

**Files:**
- Create: `apps/admin/app/types/image.ts`
- Modify: `apps/admin/app/components/ImageUpload.vue`

Поведение: model — `string | ImageValue | null`. Инпут alt: если model — объект → пишем per-usage в объект; если строка → пишем central через `media.update` (дебаунс) и префилл из `media.altMap`. Подсказка под инпутом, когда alt пуст.

- [ ] **Step 1: Тип ImageValue (admin)**

```ts
// apps/admin/app/types/image.ts
export type ImageValue = string | { url: string; alt?: string | null };
```

- [ ] **Step 2: Расширить model и добавить вычисления в `<script setup>`**

Заменить строку `const model = defineModel<string | null>({ default: null });` на:

```ts
import type { ImageValue } from "~/types/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const model = defineModel<ImageValue | null>({ default: null });

const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();

// текущий url и режим хранения alt
const currentUrl = computed(() =>
  typeof model.value === "string" ? model.value : (model.value?.url ?? null),
);
const isObjectModel = computed(() => !!model.value && typeof model.value === "object");

// central-карта (для префилла строкового режима)
const { data: altMap } = useQuery({
  ...$orpc.media.altMap.queryOptions(),
  enabled: computed(() => !!currentUrl.value && !isObjectModel.value),
});

const updateAlt = useMutation($orpc.media.update.mutationOptions());

const altText = computed<string>(() => {
  if (isObjectModel.value) return (model.value as { alt?: string | null }).alt ?? "";
  const url = currentUrl.value;
  return (url && altMap.value?.[url]) || "";
});

function setAlt(value: string) {
  const url = currentUrl.value;
  if (!url) return;
  if (isObjectModel.value) {
    model.value = { url, alt: value || null };
  } else {
    updateAlt.mutate(
      { url, alt: value },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: $orpc.media.altMap.key() }),
      },
    );
  }
}
```

В `processFile` строку `model.value = publicUrl;` заменить на сохранение url с сохранением режима:

```ts
    model.value = isObjectModel.value ? { url: publicUrl, alt: null } : publicUrl;
```

В `onPick(url)` аналогично: `model.value = isObjectModel.value ? { url, alt: null } : url;`

- [ ] **Step 3: В превью использовать `currentUrl` и добавить alt-инпут**

В шаблоне заменить `v-if="model"` → `v-if="currentUrl"` и `<img :src="model" ...>` → `<img :src="currentUrl" ...>`. Под блоком превью (после `</div>` карточки превью) добавить:

```vue
    <div v-if="currentUrl" class="mt-2 space-y-1">
      <UInput
        :model-value="altText"
        placeholder="alt-текст (описание изображения)"
        size="sm"
        class="w-full"
        icon="i-solar-text-field-linear"
        @update:model-value="(v: string | number) => setAlt(String(v))"
      />
      <p v-if="!altText" class="text-xs text-(--ui-text-dimmed)">
        Опишите изображение для SEO и доступности. Декоративную картинку оставьте без alt.
      </p>
    </div>
```

- [ ] **Step 4: Проверить типы и preview**

Run: `pnpm check-types`
Expected: PASS.
Затем admin preview: загрузить картинку у сущности со строковым полем (напр. обложка новости), ввести alt → запрос `media.update` 200, поле сохраняется; перезаход показывает alt (префилл из altMap).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/app/types/image.ts apps/admin/app/components/ImageUpload.vue
git commit -m "feat(admin): alt-инпут в ImageUpload (central/per-usage) (#66)"
```

---

### Task 6: Admin — alt на элемент галереи в `GalleryUpload`

**Files:**
- Modify: `apps/admin/app/types/gallery.ts`
- Modify: `apps/admin/app/components/GalleryUpload.vue`

Поведение: каждый элемент получает alt-инпут. Если элемент — объект (`withCaptions` или per-usage) → alt в объекте; если строка → central через `media.update`. Новый проп `withAlt` (default `true`) включает alt-инпут независимо от подписей; при `withAlt` элементы оборачиваются в объект.

- [ ] **Step 1: Расширить тип**

```ts
// apps/admin/app/types/gallery.ts
export type GalleryItem = {
  url: string;
  alt?: string | null;
  title?: string | null;
  description?: string | null;
};
```

- [ ] **Step 2: Добавить проп `withAlt` и обновить `wrap()`**

В `defineProps` добавить `withAlt?: boolean;` с дефолтом `true` в `withDefaults`. Заменить `wrap`:

```ts
function wrap(url: string): string | GalleryItem {
  return props.withCaptions || props.withAlt ? { url } : url;
}
```

- [ ] **Step 3: central-карта + мутация (для строковых элементов)**

В `<script setup>` добавить (рядом с `$orpcClient`):

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();
const { data: altMap } = useQuery($orpc.media.altMap.queryOptions());
const updateAlt = useMutation($orpc.media.update.mutationOptions());

function altFor(item: GalleryItem): string {
  return item.alt ?? altMap.value?.[item.url] ?? "";
}

function setAlt(index: number, value: string) {
  const current = items.value[index];
  if (!current) return;
  const raw = model.value[index];
  if (raw && typeof raw === "object") {
    const next = [...items.value];
    next[index] = { ...current, alt: value || null };
    model.value = next;
  } else {
    updateAlt.mutate(
      { url: current.url, alt: value },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: $orpc.media.altMap.key() }) },
    );
  }
}
```

- [ ] **Step 4: alt-инпут в разметке каждого элемента**

Внутри `v-for` элемента галереи, после блока превью (`</div>` обёртки картинки), перед/рядом с блоком `withCaptions`, добавить:

```vue
        <UInput
          v-if="!disabled"
          :model-value="altFor(item)"
          placeholder="alt-текст"
          size="sm"
          class="w-full"
          @update:model-value="(v: string | number) => setAlt(i, String(v))"
        />
```

- [ ] **Step 5: Проверить типы и preview**

Run: `pnpm check-types`
Expected: PASS.
Admin preview: галерея проекта — ввести alt у фото; для объект-элементов сохраняется в данные, для строковых уходит `media.update`.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/app/types/gallery.ts apps/admin/app/components/GalleryUpload.vue
git commit -m "feat(admin): alt на элемент галереи в GalleryUpload (#66)"
```

---

### Task 7: E2E Фазы 1 — central alt доезжает до web

**Files:** нет правок кода — приёмочная проверка.

- [ ] **Step 1: Прогнать тесты и типы**

Run: `pnpm test && pnpm check-types`
Expected: PASS (включая новый `image-value.test.ts`).

- [ ] **Step 2: Сквозная проверка central**

1. В admin задать alt у картинки со строковым полем (обложка новости/аватар контакта) → `media.update` 200.
2. На web (preview) открыть страницу, где эта картинка выводится через `<AppImage>`.
3. `preview_snapshot` / инспекция DOM: атрибут `alt` равен заданному тексту (central победил fallback рендерера).
4. Очистить alt → на web возвращается fallback рендерера (title/name).

- [ ] **Step 3: Промежуточный коммит прогресса в issue**

```bash
gh issue comment 66 --body "Фаза 1 готова: central alt (media.update/altMap), union-aware AppImage, alt-инпут в ImageUpload/GalleryUpload. Проверено E2E (admin→web)."
```

---

## ФАЗА 2 — per-usage override в блоках

### Task 8: Zod-хелперы `imageValue`/`imagesValue`

**Files:**
- Modify: `packages/api/src/shared/blocks/_core.ts`
- Test: `packages/api/src/shared/blocks/__tests__/image-value-schema.test.ts`

- [ ] **Step 1: Падающий тест на схему**

```ts
// packages/api/src/shared/blocks/__tests__/image-value-schema.test.ts
import { describe, it, expect } from "vitest";
import { imageValue, imagesValue } from "../_core";

describe("imageValue", () => {
  it("принимает строку-url", () => {
    expect(imageValue.parse("https://s3/x.jpg")).toBe("https://s3/x.jpg");
  });
  it("принимает объект {url, alt}", () => {
    expect(imageValue.parse({ url: "https://s3/x.jpg", alt: "Фасад" })).toEqual({
      url: "https://s3/x.jpg",
      alt: "Фасад",
    });
  });
  it("alt опционален", () => {
    expect(imageValue.parse({ url: "https://s3/x.jpg" })).toEqual({ url: "https://s3/x.jpg" });
  });
});

describe("imagesValue", () => {
  it("массив строк и объектов вперемешку", () => {
    const v = ["https://s3/a.jpg", { url: "https://s3/b.jpg", alt: "b" }];
    expect(imagesValue.parse(v)).toEqual(v);
  });
});
```

- [ ] **Step 2: Запустить — упадёт**

Run: `pnpm vitest run packages/api/src/shared/blocks/__tests__/image-value-schema.test.ts`
Expected: FAIL — `imageValue`/`imagesValue` не экспортируются.

- [ ] **Step 3: Добавить хелперы в `_core.ts`**

В начале (после `import { z }`) добавить экспорты:

```ts
/** Значение картинки: legacy-строка url ИЛИ объект с per-usage alt. */
export const imageValue = z.union([
  z.string().url(),
  z.object({ url: z.string().url(), alt: z.string().optional() }),
]);

export const imagesValue = z.array(imageValue);
```

- [ ] **Step 4: Запустить — зелёный**

Run: `pnpm vitest run packages/api/src/shared/blocks/__tests__/image-value-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/shared/blocks/_core.ts packages/api/src/shared/blocks/__tests__/image-value-schema.test.ts
git commit -m "feat(api): Zod-хелперы imageValue/imagesValue для per-usage alt (#66)"
```

---

### Task 9: Генератор эмитит `imageValue`/`imagesValue`

**Files:**
- Modify: `scripts/generate-block/field-types.ts`
- Modify: `scripts/generate-block/generators/block-definition.ts`

Контекст: сейчас `image.zodType = "z.string().url()"`, `images.zodType = "z.array(z.string().url())"` ([field-types.ts](../../../scripts/generate-block/field-types.ts)). `block-definition.ts` собирает import-строку для `defineBlock`.

- [ ] **Step 1: Обновить `field-types.ts` для `image`/`images`**

```ts
image: {
  label: "Изображение (image URL)",
  zodType: "imageValue",
  tsType: "string | { url: string; alt?: string | null } | null",
  defaultValue: "null",
  nullableWhenOptional: true,
  vueTemplate: (ctx) => { /* без изменений */ },
},
images: {
  label: "Галерея изображений (array of URLs)",
  zodType: "imagesValue",
  tsType: "Array<string | { url: string; alt?: string | null }>",
  defaultValue: "[]",
  vueTemplate: (ctx) => { /* без изменений */ },
},
```

- [ ] **Step 2: Импорт хелперов в эмиссии определения**

В `block-definition.ts` определить, используются ли image-поля (рекурсивно, включая subFields repeater), и если да — добавить в строку импорта из `"./_core"` идентификаторы `imageValue`/`imagesValue` рядом с `defineBlock`. Реализация:

```ts
function usedImageHelpers(fields: FieldInfo[]): string[] {
  const set = new Set<string>();
  const walk = (fs: FieldInfo[]) => {
    for (const f of fs) {
      if (f.type === "image") set.add("imageValue");
      if (f.type === "images") set.add("imagesValue");
      if (f.type === "repeater" && f.subFields) walk(f.subFields);
    }
  };
  walk(fields);
  return [...set];
}
```

Сформировать импорт так, чтобы порядок был детерминирован (`defineBlock` + отсортированные хелперы), например:
`import { ${["defineBlock", ...usedImageHelpers(info.fields).sort()].join(", ")} } from "./_core";`

(Если ранее импортировался только `defineBlock` из другого пути — сверить фактический импорт в существующих файлах и воспроизвести его 1:1, добавив хелперы.)

- [ ] **Step 3: Проверить эмиссию на одном блоке (печать)**

Run: `pnpm vitest run scripts/generate-block/__tests__/generators.test.ts -t "about-company"`
Expected: FAIL — round-trip покажет диф (файл ещё старый). Это ожидаемо; чиним в Task 10.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-block/field-types.ts scripts/generate-block/generators/block-definition.ts
git commit -m "feat(generator): image/images эмитят imageValue/imagesValue (#66)"
```

---

### Task 10: Перегенерировать определения блоков + round-trip зелёный

**Files (Modify):**
- `packages/api/src/shared/blocks/about-company.ts`
- `packages/api/src/shared/blocks/about-features.ts`
- `packages/api/src/shared/blocks/about-project.ts`
- `packages/api/src/shared/blocks/hero-fullscreen.ts`
- `packages/api/src/shared/blocks/infrastructure-tabs.ts`
- `packages/api/src/shared/blocks/temas.ts`

Цель — привести dataSchema/импорты к новой канонической эмиссии. В каждом файле:
1. в `dataSchema` заменить image-поля: `z.string().url()` → `imageValue`, `z.array(z.string().url())` → `imagesValue` (только там, где поле объявлено как тип `image`/`images`; **не трогать** `buttonUrl`/`primaryButtonUrl` и пр. — это `url`-поля c `z.union([z.string().url(), z.literal("")])`);
2. добавить `imageValue`/`imagesValue` в импорт из `"./_core"`.

Конкретные строки (из грепа):
- `about-features.ts:50` `image: z.string().url(),` → `image: imageValue,`
- `about-company.ts:68` `image: z.string().url(),` → `image: imageValue,`
- `about-project.ts:64` `images: z.array(z.string().url()),` → `images: imagesValue,`
- `hero-fullscreen.ts:102` `images: z.array(z.string().url()),` → `images: imagesValue,`
- `infrastructure-tabs.ts:64` `image: z.string().url(),` → `image: imageValue,`
- `temas.ts:43` `avatar: z.string().url(),` → `avatar: imageValue,`

- [ ] **Step 1: Внести правки во все 6 файлов** (dataSchema + импорт), сверяясь с фактической строкой импорта `defineBlock`.

- [ ] **Step 2: Запустить round-trip и consistency-тесты**

Run: `pnpm vitest run scripts/generate-block/__tests__/generators.test.ts packages/api/src/shared/blocks/__tests__/blocks.test.ts`
Expected: round-trip PASS (эмиссия == файлы). Если consistency-тест на image-поля упадёт (ждёт `z.string().url()` в shape) — см. Task 11.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/shared/blocks/{about-company,about-features,about-project,hero-fullscreen,infrastructure-tabs,temas}.ts
git commit -m "refactor(api): dataSchema image-полей блоков на imageValue/imagesValue (#66)"
```

---

### Task 11: Обновить consistency-тест блоков под union

**Files:**
- Modify: `packages/api/src/shared/blocks/__tests__/blocks.test.ts`

Контекст: тест сверяет имена `fields` ↔ ключи `defaultData` ↔ ключи `dataSchema` shape. Имена не меняются — этот тест должен оставаться зелёным. Но если есть проверки конкретного Zod-типа image-поля (`instanceof ZodString` и т.п.) — ослабить их до «строка или объект».

- [ ] **Step 1: Прочитать тест и найти проверки типа image-поля**

Run: `grep -n "image\|ZodString\|ZodArray\|url" packages/api/src/shared/blocks/__tests__/blocks.test.ts`

- [ ] **Step 2: Если такие проверки есть — заменить на проверку парсинга обоих вариантов**

Для затронутых полей убедиться, что схема принимает и строку, и объект:

```ts
// пример: для image-поля
expect(() => shape.image.parse("https://s3/x.jpg")).not.toThrow();
expect(() => shape.image.parse({ url: "https://s3/x.jpg", alt: "a" })).not.toThrow();
```

Если явных проверок типа нет (тест только про имена) — правок не требуется, перейти к Step 3.

- [ ] **Step 3: Полный прогон тестов**

Run: `pnpm test`
Expected: PASS (все наборы, включая новые).

- [ ] **Step 4: Commit (если были правки)**

```bash
git add packages/api/src/shared/blocks/__tests__/blocks.test.ts
git commit -m "test(api): consistency-тест блоков допускает union image-значение (#66)"
```

---

### Task 12: Editor — per-usage alt в редакторах блоков

**Files:**
- Modify: editors блоков с image/images: `apps/admin/app/components/blocks/editors/{AboutCompanyBlock,AboutFeaturesBlock,AboutProjectBlock,HeroFullscreenBlock,InfrastructureTabsBlock,TemasBlock}.vue`

Контекст: editor-SFC — генерируемые артефакты, но их `defineModel<{...}>` типы и биндинг `ImageUpload`/`GalleryUpload` уже работают с union из Task 5/6 (model теперь `string | ImageValue | null`, объект пишется автоматически, т.к. `isObjectModel` определяется по значению). **Per-usage включается тем, что значение становится объектом при первом вводе alt** — отдельных правок биндинга обычно не нужно.

- [ ] **Step 1: Проверить типы редакторов**

Run: `pnpm check-types`
Expected: PASS. Если `defineModel<{ image: string | null }>` в editor конфликтует с объектом — расширить тип поля до `string | { url: string; alt?: string | null } | null` (и `images` до `Array<...>`). Править руками только тип в `defineModel`, не трогая разметку.

- [ ] **Step 2: Preview — per-usage в блоке**

Admin preview: открыть страницу с блоком (напр. About Company), под картинкой ввести alt → значение в данных блока становится объектом `{url, alt}` (проверить, что сохранение страницы проходит, Zod не падает).

- [ ] **Step 3: Commit (если правились типы)**

```bash
git add apps/admin/app/components/blocks/editors/*.vue
git commit -m "feat(admin): per-usage alt в редакторах блоков с картинками (#66)"
```

---

### Task 13: Web — аудит рендереров на «сырые» строковые операции

**Files:**
- Modify (по результатам аудита): `apps/web/app/components/blocks/renderers/*.vue`

Контекст: `:src="image"` в `<AppImage>` менять **не нужно** (union-aware). Чинить только места, где значение используется как строка: ключи (`:key="src"`), вычисления над URL, `v-for` по массиву объектов.

- [ ] **Step 1: Найти подозрительные места**

Run: `grep -rn ':key="src"\|:key="image\|images\[\|\.images\b' apps/web/app/components/blocks/renderers/`

Известные кандидаты: `HeroFullscreenBlock.vue` (`v-for="(src, i) in images"` + `:key="src"`), `AboutProjectBlock.vue` (`images[currentSlide]`), `ProjectGalleryBlock.vue` (массив).

- [ ] **Step 2: Импортировать `imageUrl` и нормализовать ключи/URL**

В затронутых рендерерах:

```ts
import { imageUrl } from "~/utils/image-value";
```

Заменить `:key="src"` → `:key="imageUrl(src)"`. Если где-то URL подставляется в строку/стиль/`useOptimizedImage(...)` — оборачивать в `imageUrl(...)`. Передачу в `<AppImage :src="src">` оставить как есть.

- [ ] **Step 3: Preview — оба пути alt на web**

Поднять web preview. Проверить блок с per-usage alt: в DOM `<img alt>` равен per-usage; затем картинка с central alt без per-usage → central; затем без обоих → fallback рендерера. Слайдеры (Hero/AboutProject) переключаются без ошибок (ключи валидны).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/blocks/renderers/
git commit -m "fix(web): нормализация url через imageUrl в рендерерах-слайдерах (#66)"
```

---

### Task 14: Финальная приёмка и обновление документации

**Files:**
- Modify: `docs/images.md`

- [ ] **Step 1: Полный прогон**

Run: `pnpm test && pnpm check-types`
Expected: PASS.

- [ ] **Step 2: Сквозная E2E (обе фазы)**

1. Per-usage: alt в блоке → web показывает его.
2. Central: alt у файла (обложка/аватар) → web показывает его везде, где файл вставлен.
3. Приоритет: per-usage перебивает central; central перебивает fallback рендерера; пустые — fallback → "".
4. «Сделать значением по умолчанию для файла» в блочном `ImageUpload` пушит per-usage в central (`media.update`), проверить инвалидацию `altMap`.

- [ ] **Step 3: Дополнить `docs/images.md`**

Добавить раздел «Alt-теги»: центральный `media.alt` (редактируется в загрузчиках), per-usage в блоках (`imageValue`), цепочка резолва в `AppImage`, карта `media.altMap` + `useImageAlt`. Кратко, в стиле существующего файла.

- [ ] **Step 4: Commit + комментарий в issue**

```bash
git add docs/images.md
git commit -m "docs(images): раздел про alt-теги (central + per-usage) (#66)"
gh issue comment 66 --body "Готово полностью (Фаза 1+2). Per-usage alt в блоках, central alt для всех загрузчиков, вывод в AppImage по цепочке приоритетов. Тесты зелёные, E2E пройдено."
```

---

## Self-Review (выполнено при написании)

- **Покрытие спеки:** `media.update`/`media.altMap` (Task 2), alt-инпут в загрузчиках (Task 5, 6), union-aware AppImage + useImageAlt + карта (Task 1, 3, 4), per-usage union в блоках + генератор + тесты (Task 8–11), редакторы/рендереры (Task 12, 13), подсказка при пустом alt (Task 5), приоритетная цепочка (Task 1), non-goals не реализуются. ✔
- **Типы/имена согласованы:** `ImageValue` (web `utils/image-value.ts`, admin `types/image.ts`), `imageUrl`/`resolveImageAlt`, `useAltMap`/`useImageAlt`, `imageValue`/`imagesValue`, `media.update`/`media.altMap`, `media.altMap.key()` для инвалидации — используются единообразно во всех тасках. ✔
- **Плейсхолдеров нет:** все шаги содержат код/команды/ожидаемый результат. ✔
- **Риски, отмеченные в плане:** точная строка импорта `defineBlock` (Task 9/10 — сверить с файлом); consistency-тест может не требовать правок (Task 11 ветвится); Vue SFC не тайпчекаются — Vue-слой проверяется в preview.
