<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, uploadToS3 } from "~/utils/upload";
import type { AllowedImageType } from "~/utils/upload";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const page = ref(1);
const pageSize = 24;
const search = ref("");
const debouncedSearch = refDebounced(search, 300);

watch(debouncedSearch, () => {
  page.value = 1;
});

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.media.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        search: debouncedSearch.value || undefined,
      },
    }),
  ),
);

const items = computed(() => data.value?.data ?? []);
const total = computed(() => data.value?.total ?? 0);

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.media.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Файл удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.media.list.key() });
  },
  onError: () => {
    toast.add({ title: "Ошибка удаления", color: "error" });
  },
});

const uploading = ref(false);
const uploadProgress = ref(0);
const dropZoneRef = ref<HTMLDivElement>();

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: (files) => {
    if (uploading.value || !files?.length) return;
    processFile(files[0]!);
  },
});

let currentAbort: (() => void) | null = null;

onUnmounted(() => {
  currentAbort?.();
});

async function processFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
    toast.add({ title: "Неподдерживаемый формат", color: "warning" });
    return;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    toast.add({ title: "Файл слишком большой (макс 10 МБ)", color: "warning" });
    return;
  }

  uploading.value = true;
  uploadProgress.value = 0;

  try {
    const { presignedUrl } = await $orpcClient.uploads.getPresignedUrl({
      fileName: file.name,
      contentType: file.type as AllowedImageType,
      fileSize: file.size,
      folder: "media",
    });

    const { promise, abort } = uploadToS3(presignedUrl, file, (pct) => {
      uploadProgress.value = pct;
    });
    currentAbort = abort;
    await promise;
    currentAbort = null;

    toast.add({ title: "Файл загружен", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.media.list.key() });
  } catch (error: any) {
    toast.add({
      title: "Ошибка загрузки",
      description: error.message,
      color: "error",
    });
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
  }
}

function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) processFile(file);
  input.value = "";
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
  <PageContainer>
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">Медиа</h1>
      <p class="text-(--ui-text-muted) text-sm mt-1">Библиотека загруженных файлов</p>
    </div>

    <div
      ref="dropZoneRef"
      class="mb-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors"
      :class="
        isOverDropZone
          ? 'border-(--ui-primary) bg-(--ui-primary)/5'
          : 'border-(--ui-border) hover:border-(--ui-primary)'
      "
    >
      <UIcon
        v-if="!uploading"
        name="i-tabler-cloud-upload"
        class="size-10 text-(--ui-text-muted) mb-2"
      />
      <UIcon
        v-else
        name="i-tabler-loader-2"
        class="size-10 animate-spin text-(--ui-text-muted) mb-2"
      />
      <p class="text-sm text-(--ui-text-muted)">
        {{
          uploading
            ? `Загрузка... ${uploadProgress}%`
            : isOverDropZone
              ? "Отпустите для загрузки"
              : "Перетащите файл сюда или"
        }}
      </p>
      <label v-if="!uploading" class="mt-2 cursor-pointer">
        <UButton as="span" variant="outline" icon="i-tabler-upload">
          Выбрать файл
        </UButton>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          class="hidden"
          :disabled="uploading"
          @change="handleFileInput"
        />
      </label>
      <p v-if="!uploading" class="mt-2 text-xs text-(--ui-text-dimmed)">
        JPEG, PNG, WebP, AVIF до 10 МБ
      </p>
      <div v-if="uploading" class="mt-3 w-64">
        <div class="h-1 rounded-full bg-(--ui-bg-elevated)">
          <div
            class="h-full rounded-full bg-(--ui-primary) transition-all"
            :style="{ width: `${uploadProgress}%` }"
          />
        </div>
      </div>
    </div>

    <div class="mb-4 flex items-center gap-3">
      <UInput
        v-model="search"
        placeholder="Поиск по имени файла..."
        icon="i-tabler-search"
        class="w-64"
      />
      <UBadge variant="subtle" color="neutral" class="ml-auto">
        {{ total }} файлов
      </UBadge>
    </div>

    <div v-if="isPending" class="flex justify-center py-12">
      <UIcon name="i-tabler-loader-2" class="animate-spin text-2xl" />
    </div>

    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <UIcon name="i-tabler-photo-off" class="text-4xl text-(--ui-text-dimmed) mb-3" />
      <p class="text-(--ui-text-muted)">Файлов пока нет</p>
      <p class="text-xs text-(--ui-text-dimmed) mt-1">
        Загрузите изображения через форму выше
      </p>
    </div>

    <div
      v-else
      class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <div
        v-for="item in items"
        :key="item.id"
        class="group relative rounded-xl border border-(--ui-border) overflow-hidden bg-(--ui-bg-elevated)"
      >
        <div class="aspect-square overflow-hidden">
          <img
            v-if="item.contentType?.startsWith('image/')"
            :src="item.url"
            :alt="item.fileName ?? ''"
            class="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          <div
            v-else
            class="h-full w-full flex items-center justify-center bg-(--ui-bg-muted)"
          >
            <UIcon name="i-tabler-file" class="size-10 text-(--ui-text-dimmed)" />
          </div>
        </div>

        <div class="p-3 space-y-1">
          <p class="text-sm font-medium text-(--ui-text-highlighted) truncate">
            {{ item.fileName ?? "Без имени" }}
          </p>
          <div class="flex items-center gap-2">
            <span class="text-xs text-(--ui-text-dimmed)">
              {{ formatFileSize(item.fileSize) }}
            </span>
            <UBadge
              v-if="item.folder"
              variant="subtle"
              color="neutral"
              size="xs"
            >
              {{ item.folder }}
            </UBadge>
          </div>
        </div>

        <button
          class="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
          @click="deleteMutation.mutate(item.id)"
        >
          <UIcon name="i-tabler-trash" class="size-4 text-white" />
        </button>
      </div>
    </div>

    <div v-if="total > pageSize" class="mt-6 flex justify-center">
      <UPagination
        v-model:page="page"
        :total="total"
        :items-per-page="pageSize"
      />
    </div>
  </PageContainer>
</template>
