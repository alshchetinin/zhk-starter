<script setup lang="ts">
const model = defineModel<string[]>({ default: () => [] });
const props = defineProps<{ projectId: string }>();

const { $orpcClient } = useNuxtApp();
const toast = useToast();

const uploading = ref(false);
const isDragging = ref(false);
const uploadProgress = ref<Record<string, number>>({});

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function uploadToS3(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}

async function processFiles(files: File[]) {
  if (!files.length) return;

  uploading.value = true;
  const newUrls: string[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      toast.add({ title: `Неподдерживаемый формат: ${file.name}`, color: "warning" });
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.add({ title: `Файл слишком большой: ${file.name}`, color: "warning" });
      continue;
    }

    try {
      const { presignedUrl, publicUrl } = await $orpcClient.uploads.getPresignedUrl({
        fileName: file.name,
        contentType: file.type as (typeof ALLOWED_TYPES)[number],
        fileSize: file.size,
        folder: `projects/${props.projectId}/gallery`,
      });

      await uploadToS3(presignedUrl, file, (progress) => {
        uploadProgress.value[file.name] = progress;
      });

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

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (!uploading.value) isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  if (uploading.value) return;
  const files = Array.from(event.dataTransfer?.files ?? []);
  processFiles(files);
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
      class="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors"
      :class="
        isDragging
          ? 'border-(--ui-primary) bg-(--ui-primary)/5'
          : 'border-(--ui-border) hover:border-(--ui-primary)'
      "
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
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
        {{ uploading ? "Загрузка..." : isDragging ? "Отпустите для загрузки" : "Нажмите или перетащите изображения" }}
      </span>
      <span v-if="!uploading && !isDragging" class="mt-1 text-xs text-(--ui-text-dimmed)">
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
