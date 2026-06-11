<script setup lang="ts">
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, uploadToS3 } from "~/utils/upload";
import type { AllowedImageType } from "~/utils/upload";

const model = defineModel<string | null>({ default: null });
const props = withDefaults(
  defineProps<{
    folder?: string;
    label?: string;
  }>(),
  {
    folder: "uploads",
    label: "Нажмите или перетащите изображение",
  },
);

const { $orpcClient } = useNuxtApp();
const toast = useToast();

const uploading = ref(false);
const uploadProgress = ref(0);
const dropZoneRef = ref<HTMLLabelElement>();
const showMediaPicker = ref(false);

function onPick(url: string) {
  model.value = url;
  showMediaPicker.value = false;
}

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: (files) => {
    if (uploading.value || !files?.[0]) return;
    processFile(files[0]);
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
    const { presignedUrl, publicUrl } =
      await $orpcClient.uploads.getPresignedUrl({
        fileName: file.name,
        contentType: file.type as AllowedImageType,
        fileSize: file.size,
        folder: props.folder,
      });

    const { promise, abort } = uploadToS3(presignedUrl, file, (pct) => {
      uploadProgress.value = pct;
    });
    currentAbort = abort;
    await promise;
    currentAbort = null;

    model.value = publicUrl;
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

function handleFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) processFile(file);
  input.value = "";
}

function remove() {
  model.value = null;
}
</script>

<template>
  <div>
    <!-- Preview -->
    <div
      v-if="model"
      class="group relative aspect-video w-full overflow-hidden rounded-lg border border-(--ui-border)"
    >
      <img :src="model" class="h-full w-full object-cover" />
      <button
        class="absolute right-2 top-2 rounded-full bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100"
        @click="remove"
      >
        <UIcon name="i-solar-close-circle-linear" class="size-4 text-white" />
      </button>
    </div>

    <!-- Upload area -->
    <label
      v-else
      ref="dropZoneRef"
      class="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors"
      :class="
        isOverDropZone
          ? 'border-(--ui-primary) bg-(--ui-primary)/5'
          : 'border-(--ui-border) hover:border-(--ui-primary)'
      "
    >
      <UIcon
        v-if="!uploading"
        name="i-solar-gallery-add-linear"
        class="size-8 text-(--ui-text-muted)"
      />
      <UIcon
        v-else
        name="i-solar-refresh-linear"
        class="size-8 animate-spin text-(--ui-text-muted)"
      />
      <span class="mt-2 text-sm text-(--ui-text-muted)">
        {{
          uploading
            ? `Загрузка... ${uploadProgress}%`
            : isOverDropZone
              ? "Отпустите для загрузки"
              : label
        }}
      </span>
      <span
        v-if="!uploading && !isOverDropZone"
        class="mt-1 text-xs text-(--ui-text-dimmed)"
      >
        JPEG, PNG, WebP, AVIF до 10 МБ
      </span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        class="hidden"
        :disabled="uploading"
        @change="handleFile"
      />
    </label>

    <div v-if="!model" class="mt-2 flex justify-center">
      <UButton
        variant="ghost"
        size="xs"
        icon="i-solar-gallery-minimalistic-linear"
        :disabled="uploading"
        @click.prevent="showMediaPicker = true"
      >
        Выбрать из библиотеки
      </UButton>
    </div>

    <MediaPickerModal
      v-model:open="showMediaPicker"
      @select="onPick"
    />

    <!-- Progress bar -->
    <div v-if="uploading" class="mt-2">
      <div class="h-1 rounded-full bg-(--ui-bg-elevated)">
        <div
          class="h-full rounded-full bg-(--ui-primary) transition-all"
          :style="{ width: `${uploadProgress}%` }"
        />
      </div>
    </div>
  </div>
</template>
