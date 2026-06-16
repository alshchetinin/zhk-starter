# Media Detail Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** В разделе «Медиа» по клику на превью открывать модалку с полным изображением, метаданными, редактированием alt и действиями (копировать URL, скачать, удалить, листать ←/→).

**Architecture:** Новый компонент `MediaDetailModal.vue` на `UModal` принимает текущую страницу списка (`items`) и `v-model:index`. Страница `media/index.vue` отдаёт инлайн-редактирование alt в модалку, превью делает кликабельным и помечает карточки без alt бейджем. Бэкенд не меняется (`media.update`/`media.delete` уже есть; размеры/копирование/скачивание — на клиенте).

**Tech Stack:** Nuxt 4 (admin SPA), @nuxt/ui v4, @tanstack/vue-query, oRPC client, VueUse (`useClipboard`).

**Issue:** [#72](https://github.com/alshchetinin/zhk-starter/issues/72) · **Спек:** `docs/superpowers/specs/2026-06-15-media-detail-modal-design.md`

---

### Task 1: Вынести `formatFileSize` в общий util (TDD)

`formatFileSize` сейчас локальна в `media/index.vue`; модалке она тоже нужна → DRY-вынос в `app/utils/format.ts` под тест (утилиты в проекте тестируются vitest).

**Files:**
- Test: `apps/admin/app/utils/__tests__/format.test.ts` (create)
- Modify: `apps/admin/app/utils/format.ts`
- Modify: `apps/admin/app/pages/media/index.vue` (удалить локальную функцию, импортировать)

- [ ] **Step 1: Написать падающий тест**

`apps/admin/app/utils/__tests__/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatFileSize } from "../format";

describe("formatFileSize", () => {
  it("returns dash for empty / zero", () => {
    expect(formatFileSize(0)).toBe("—");
    expect(formatFileSize(null)).toBe("—");
    expect(formatFileSize(undefined)).toBe("—");
  });
  it("formats bytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });
  it("formats kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2.0 KB");
  });
  it("formats megabytes", () => {
    expect(formatFileSize(1_572_864)).toBe("1.5 MB");
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `pnpm test -- format` (из корня репозитория)
Expected: FAIL — `formatFileSize is not exported` / not a function.

- [ ] **Step 3: Реализовать в `format.ts`**

Добавить в конец `apps/admin/app/utils/format.ts`:

```ts
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `pnpm test -- format`
Expected: PASS (4 теста).

- [ ] **Step 5: Переключить `media/index.vue` на импорт**

В `apps/admin/app/pages/media/index.vue` удалить локальную функцию `formatFileSize` (строки ~142–147) и добавить импорт в начало `<script setup>`:

```ts
import { formatFileSize, formatDate } from "~/utils/format";
```

(`formatDate` понадобится в Task 3 не здесь — оставить только `formatFileSize`, если `formatDate` в index.vue не используется. В index.vue достаточно `import { formatFileSize } from "~/utils/format";`.)

- [ ] **Step 6: Коммит**

```bash
git add apps/admin/app/utils/format.ts apps/admin/app/utils/__tests__/format.test.ts apps/admin/app/pages/media/index.vue
git commit -m "refactor(admin): вынести formatFileSize в utils/format (#72)"
```

---

### Task 2: Компонент `MediaDetailModal.vue`

**Files:**
- Create: `apps/admin/app/components/MediaDetailModal.vue`

- [ ] **Step 1: Создать компонент целиком**

`apps/admin/app/components/MediaDetailModal.vue`:

```vue
<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { formatFileSize, formatDate } from "~/utils/format";

interface MediaItem {
  id: string;
  url: string;
  fileName: string | null;
  contentType: string | null;
  fileSize: number | null;
  folder: string | null;
  alt: string | null;
  createdAt: string | Date;
}

const props = defineProps<{ items: MediaItem[] }>();
const index = defineModel<number | null>("index", { default: null });

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();
const { copy } = useClipboard();

const open = computed({
  get: () => index.value !== null,
  set: (v) => {
    if (!v) index.value = null;
  },
});

const item = computed(() =>
  index.value !== null ? (props.items[index.value] ?? null) : null,
);

const hasPrev = computed(() => index.value !== null && index.value > 0);
const hasNext = computed(
  () => index.value !== null && index.value < props.items.length - 1,
);
function prev() {
  if (hasPrev.value) index.value!--;
}
function next() {
  if (hasNext.value) index.value!++;
}

// Размеры читаем из загруженной картинки (в БД их нет)
const dimensions = ref<string | null>(null);
function onImageLoad(e: Event) {
  const img = e.target as HTMLImageElement;
  dimensions.value = `${img.naturalWidth}×${img.naturalHeight}`;
}

// alt: локальный черновик, оптимистичное сохранение на blur
const altDraft = ref("");
watch(
  item,
  (it) => {
    altDraft.value = it?.alt ?? "";
    dimensions.value = null;
    confirmDelete.value = false;
  },
  { immediate: true },
);

const updateAlt = useMutation({
  mutationFn: (input: { url: string; alt: string }) =>
    $orpcClient.media.update(input),
  onMutate: async (input) => {
    const key = $orpc.media.list.key();
    await queryClient.cancelQueries({ queryKey: key });
    const snapshots = queryClient.getQueriesData<{ data: MediaItem[] }>({
      queryKey: key,
    });
    const nextAlt = input.alt.trim() || null;
    for (const [qk, qd] of snapshots) {
      if (!qd) continue;
      queryClient.setQueryData(qk, {
        ...qd,
        data: qd.data.map((m) =>
          m.url === input.url ? { ...m, alt: nextAlt } : m,
        ),
      });
    }
    return { snapshots };
  },
  onError: (_e, _v, ctx) => {
    ctx?.snapshots.forEach(([qk, qd]) => queryClient.setQueryData(qk, qd));
    toast.add({ title: "Ошибка сохранения alt", color: "error" });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: $orpc.media.list.key() });
  },
});

function commitAlt() {
  const it = item.value;
  if (!it) return;
  if ((it.alt ?? "") === altDraft.value.trim()) return;
  updateAlt.mutate({ url: it.url, alt: altDraft.value });
}

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.media.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Файл удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.media.list.key() });
    if (index.value !== null) {
      if (props.items.length <= 1) index.value = null;
      else if (index.value >= props.items.length - 1)
        index.value = props.items.length - 2;
    }
  },
  onError: () => toast.add({ title: "Ошибка удаления", color: "error" }),
});

const confirmDelete = ref(false);
function onDelete() {
  const it = item.value;
  if (!it) return;
  if (!confirmDelete.value) {
    confirmDelete.value = true;
    return;
  }
  deleteMutation.mutate(it.id);
  confirmDelete.value = false;
}

async function copyUrl() {
  const it = item.value;
  if (!it) return;
  await copy(it.url);
  toast.add({ title: "URL скопирован", color: "success" });
}

const downloading = ref(false);
async function downloadFile() {
  const it = item.value;
  if (!it) return;
  downloading.value = true;
  try {
    const res = await fetch(it.url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = it.fileName ?? "image";
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(it.url, "_blank"); // фолбэк, если CORS не даёт fetch
  } finally {
    downloading.value = false;
  }
}

// Хоткеи ←/→ (не перехватываем, когда фокус в поле ввода)
function onKey(e: KeyboardEvent) {
  if (index.value === null) return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (e.key === "ArrowLeft") prev();
  else if (e.key === "ArrowRight") next();
}
onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <UModal
    v-model:open="open"
    :title="item?.fileName ?? 'Медиа'"
    :ui="{ width: 'sm:max-w-4xl' }"
  >
    <template #body>
      <div v-if="item" class="grid gap-4 md:grid-cols-[1fr_260px]">
        <div
          class="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-lg bg-(--ui-bg-elevated)"
        >
          <img
            :src="item.url"
            :alt="item.alt ?? item.fileName ?? ''"
            class="max-h-[70vh] w-full object-contain"
            @load="onImageLoad"
          />
          <UButton
            v-if="hasPrev"
            icon="i-solar-alt-arrow-left-linear"
            color="neutral"
            variant="solid"
            class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"
            aria-label="Предыдущая"
            @click="prev"
          />
          <UButton
            v-if="hasNext"
            icon="i-solar-alt-arrow-right-linear"
            color="neutral"
            variant="solid"
            class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
            aria-label="Следующая"
            @click="next"
          />
        </div>

        <div class="space-y-4">
          <dl class="space-y-1.5 text-xs">
            <div class="flex justify-between gap-2">
              <dt class="text-(--ui-text-muted)">Тип</dt>
              <dd class="text-(--ui-text-highlighted)">{{ item.contentType ?? "—" }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-(--ui-text-muted)">Размер</dt>
              <dd class="text-(--ui-text-highlighted)">{{ formatFileSize(item.fileSize) }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-(--ui-text-muted)">Размеры</dt>
              <dd class="text-(--ui-text-highlighted)">{{ dimensions ?? "…" }}</dd>
            </div>
            <div v-if="item.folder" class="flex justify-between gap-2">
              <dt class="text-(--ui-text-muted)">Папка</dt>
              <dd><UBadge variant="subtle" color="neutral" size="xs">{{ item.folder }}</UBadge></dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-(--ui-text-muted)">Загружен</dt>
              <dd class="text-(--ui-text-highlighted)">{{ formatDate(item.createdAt) ?? "—" }}</dd>
            </div>
          </dl>

          <div class="flex items-center gap-1.5">
            <span class="flex-1 truncate font-mono text-xs text-(--ui-text-dimmed)">{{ item.url }}</span>
            <UButton
              icon="i-solar-copy-linear"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Копировать URL"
              @click="copyUrl"
            />
          </div>

          <UFormField label="Alt-текст">
            <UTextarea
              v-model="altDraft"
              :rows="3"
              :maxlength="500"
              autoresize
              placeholder="Опишите изображение…"
              class="w-full"
              @blur="commitAlt"
            />
          </UFormField>

          <div class="flex gap-2 pt-1">
            <UButton
              icon="i-solar-download-linear"
              color="neutral"
              variant="outline"
              size="sm"
              :loading="downloading"
              class="flex-1 justify-center"
              @click="downloadFile"
            >
              Скачать
            </UButton>
            <UButton
              :icon="confirmDelete ? 'i-solar-trash-bin-trash-bold' : 'i-solar-trash-bin-trash-linear'"
              :color="confirmDelete ? 'error' : 'neutral'"
              variant="outline"
              size="sm"
              :loading="deleteMutation.isPending.value"
              class="flex-1 justify-center"
              @click="onDelete"
            >
              {{ confirmDelete ? "Точно удалить?" : "Удалить" }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
```

- [ ] **Step 2: Проверка типов**

Run: `pnpm check-types`
Expected: PASS (нет ошибок в `MediaDetailModal.vue`).

- [ ] **Step 3: Коммит**

```bash
git add apps/admin/app/components/MediaDetailModal.vue
git commit -m "feat(admin): компонент MediaDetailModal — превью + инфо + alt + действия (#72)"
```

---

### Task 3: Подключить модалку в `media/index.vue`

**Files:**
- Modify: `apps/admin/app/pages/media/index.vue`

- [ ] **Step 1: Убрать инлайн-редактирование alt из `<script setup>`**

Удалить блоки: `updateAltMutation` (строки ~45–55), `altDrafts` + его `watch` (строки ~57–70), функцию `commitAlt` (строки ~72–74). Добавить состояние модалки рядом с остальными ref:

```ts
const selectedIndex = ref<number | null>(null);
// закрывать модалку при смене страницы/поиска (индексы перестают совпадать)
watch(page, () => {
  selectedIndex.value = null;
});
```

- [ ] **Step 2: Превью → кликабельное, удалить инлайн `UInput` alt, добавить бейдж «без alt»**

В шаблоне заменить блок превью (`<div class="aspect-square …"> … </div>`, строки ~246–259) на:

```vue
<button
  v-if="item.contentType?.startsWith('image/')"
  type="button"
  class="block aspect-square w-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-(--ui-primary)"
  @click="selectedIndex = i"
>
  <img
    :src="item.url"
    :alt="item.fileName ?? ''"
    class="h-full w-full object-cover transition-transform group-hover:scale-105"
  />
</button>
<div
  v-else
  class="aspect-square flex h-full w-full items-center justify-center bg-(--ui-bg-muted)"
>
  <UIcon name="i-solar-file-linear" class="size-10 text-(--ui-text-dimmed)" />
</div>
```

Изменить `v-for`, чтобы получить индекс: `v-for="(item, i) in items"` (строка ~242).

Удалить блок инлайн `UInput` alt (строки ~279–288). В строке мета-инфо (рядом с бейджем папки) добавить бейдж «без alt»:

```vue
<UBadge
  v-if="item.contentType?.startsWith('image/') && !item.alt"
  variant="subtle"
  color="warning"
  size="xs"
>
  без alt
</UBadge>
```

- [ ] **Step 3: Смонтировать модалку**

Перед закрывающим `</PageContainer>` (после блока пагинации) добавить:

```vue
<MediaDetailModal :items="items" v-model:index="selectedIndex" />
```

- [ ] **Step 4: Проверка типов**

Run: `pnpm check-types`
Expected: PASS. Убедиться, что не осталось ссылок на удалённые `altDrafts`/`commitAlt`/`updateAltMutation`.

- [ ] **Step 5: Коммит**

```bash
git add apps/admin/app/pages/media/index.vue
git commit -m "feat(admin): клик по превью открывает модалку, alt только в модалке + бейдж «без alt» (#72)"
```

---

### Task 4: Ручная проверка в браузере

**Files:** —

- [ ] **Step 1: Запустить admin и пройти сценарий**

Run: `pnpm dev:admin` (admin на :3002), открыть `/media`.

Проверить:
1. Клик по превью → модалка с полным изображением (`object-contain`) и метаданными.
2. «Размеры» Ш×В появляются после загрузки картинки.
3. Правка alt → blur → после `F5` сохранено; в сетке у этой карточки исчезает бейдж «без alt».
4. Стрелки и клавиши ←/→ листают; на первом/последнем элементе страницы кнопки неактивны; при фокусе в поле alt стрелки не листают.
5. «Копировать URL» (тост), «Скачать» (файл скачивается; при CORS-ошибке открывается в новой вкладке), «Удалить» (двойной клик-подтверждение → модалка закрывается/смещается, файл исчезает из сетки).
6. Узкий экран — колонки в стек.

- [ ] **Step 2: Прогнать тесты и типы перед финишем**

Run: `pnpm test -- format` и `pnpm check-types`
Expected: PASS.

---

## Self-Review

**Spec coverage:**
- Модалка по клику, полное изображение, инфо, alt-редактирование → Task 2 + Task 3.
- Убрать инлайн alt из карточки → Task 3 Step 1–2.
- Бейдж «без alt» → Task 3 Step 2.
- Размеры Ш×В (клиент) → Task 2 (`onImageLoad`).
- Копировать/скачать/удалить/листать ←/→ → Task 2.
- Листание в пределах страницы, на краях disabled → Task 2 (`hasPrev`/`hasNext`).
- Оптимистичный alt-синхрон → Task 2 (`updateAlt.onMutate`).
- Бэкенд без изменений → подтверждено (используются существующие `media.update`/`media.delete`).

**Placeholder scan:** заглушек нет; код приведён полностью.

**Type consistency:** `MediaItem` определён в Task 2 и используется единообразно; `selectedIndex: number | null` ↔ `v-model:index` (`index: number | null`); имена функций (`prev`/`next`/`commitAlt`/`onDelete`/`copyUrl`/`downloadFile`) совпадают между script и template.
