<script setup lang="ts">
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, uploadToS3 } from "~/utils/upload";
import type { AllowedImageType } from "~/utils/upload";

const model = defineModel<string[]>({ default: () => [] });
const props = withDefaults(
  defineProps<{
    projectId?: string;
    folder?: string;
  }>(),
  {
    folder: "uploads/gallery",
  },
);

const { $orpcClient } = useNuxtApp();
const toast = useToast();

const uploading = ref(false);
const uploadProgress = ref<Record<string, number>>({});
const dropZoneRef = ref<HTMLLabelElement>();
const showMediaPicker = ref(false);

function onPickMultiple(urls: string[]) {
  if (urls.length) model.value = [...model.value, ...urls];
  showMediaPicker.value = false;
}

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: (files) => {
    if (uploading.value || !files?.length) return;
    processFiles(Array.from(files));
  },
});

async function processFiles(files: File[]) {
  if (!files.length) return;

  uploading.value = true;
  const newUrls: string[] = [];

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
      toast.add({ title: `Неподдерживаемый формат: ${file.name}`, color: "warning" });
      continue;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.add({ title: `Файл слишком большой: ${file.name}`, color: "warning" });
      continue;
    }

    try {
      const { presignedUrl, publicUrl } = await $orpcClient.uploads.getPresignedUrl({
        fileName: file.name,
        contentType: file.type as AllowedImageType,
        fileSize: file.size,
        folder: props.projectId ? `projects/${props.projectId}/gallery` : props.folder,
      });

      const { promise } = uploadToS3(presignedUrl, file, (progress) => {
        uploadProgress.value[file.name] = progress;
      });
      await promise;

      newUrls.push(publicUrl);
    } catch (error: any) {
      toast.add({
        title: `Ошибка загрузки ${file.name}`,
        description: error.message,
        color: "error",
      });
    }
  }

  if (newUrls.length > 0) {
    model.value = [...model.value, ...newUrls];
  }

  uploading.value = false;
  uploadProgress.value = {};
}

function handleFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  processFiles(files);
  input.value = "";
}

function removeImage(index: number) {
  model.value = model.value.filter((_, i) => i !== index);
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs text-(--ui-text-dimmed)">
      Первое изображение будет использоваться как заглавное в карточке проекта
    </p>

    <!-- Existing images grid -->
    <div v-if="model.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <div
        v-for="(url, i) in model"
        :key="url"
        class="group relative aspect-video overflow-hidden rounded-lg border-2"
        :class="i === 0 ? 'border-(--ui-primary)' : 'border-(--ui-border)'"
      >
        <img :src="url" class="h-full w-full object-cover" />
        <!-- "Main" label on first image -->
        <span
          v-if="i === 0"
          class="absolute left-2 top-2 rounded bg-(--ui-primary) px-1.5 py-0.5 text-[10px] font-medium text-(--ui-text-inverted)"
        >
          Заглавная
        </span>
        <button
          class="absolute right-2 top-2 rounded-full bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100"
          @click="removeImage(i)"
        >
          <UIcon name="i-tabler-x" class="size-4 text-white" />
        </button>
      </div>
    </div>

    <!-- Upload area with drag & drop -->
    <label
      ref="dropZoneRef"
      class="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors"
      :class="
        isOverDropZone
          ? 'border-(--ui-primary) bg-(--ui-primary)/5'
          : 'border-(--ui-border) hover:border-(--ui-primary)'
      "
    >
      <UIcon
        v-if="!uploading"
        name="i-tabler-photo-plus"
        class="size-8 text-(--ui-text-muted)"
      />
      <UIcon
        v-else
        name="i-tabler-loader-2"
        class="size-8 animate-spin text-(--ui-text-muted)"
      />
      <span class="mt-2 text-sm text-(--ui-text-muted)">
        {{ uploading ? "Загрузка..." : isOverDropZone ? "Отпустите для загрузки" : "Нажмите или перетащите изображения" }}
      </span>
      <span v-if="!uploading && !isOverDropZone" class="mt-1 text-xs text-(--ui-text-dimmed)">
        JPEG, PNG, WebP, AVIF до 10 МБ
      </span>
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        class="hidden"
        :disabled="uploading"
        @change="handleFiles"
      />
    </label>

    <div class="flex justify-center">
      <UButton
        variant="ghost"
        size="xs"
        icon="i-tabler-photo-search"
        :disabled="uploading"
        @click.prevent="showMediaPicker = true"
      >
        Выбрать из библиотеки
      </UButton>
    </div>

    <MediaPickerModal
      v-model:open="showMediaPicker"
      multiple
      @select-multiple="onPickMultiple"
    />

    <!-- Upload progress -->
    <div v-if="Object.keys(uploadProgress).length" class="space-y-2">
      <div v-for="(pct, name) in uploadProgress" :key="name" class="text-sm">
        <div class="flex justify-between text-(--ui-text-muted)">
          <span>{{ name }}</span>
          <span>{{ pct }}%</span>
        </div>
        <div class="mt-1 h-1 rounded-full bg-(--ui-bg-elevated)">
          <div
            class="h-full rounded-full bg-(--ui-primary) transition-all"
            :style="{ width: `${pct}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
