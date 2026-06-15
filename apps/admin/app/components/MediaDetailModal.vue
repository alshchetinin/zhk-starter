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

const confirmDelete = ref(false);

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
