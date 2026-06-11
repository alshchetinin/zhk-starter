<script setup lang="ts">
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, uploadToS3 } from "~/utils/upload";
import type { AllowedImageType } from "~/utils/upload";
import type { GalleryItem } from "~/types/gallery";

type ModelValue = Array<string | GalleryItem>;

const model = defineModel<ModelValue>({ default: () => [] });
const props = withDefaults(
  defineProps<{
    projectId?: string;
    folder?: string;
    withCaptions?: boolean;
    disabled?: boolean;
  }>(),
  {
    folder: "uploads/gallery",
    withCaptions: false,
    disabled: false,
  },
);

const { $orpcClient } = useNuxtApp();
const toast = useToast();

const uploading = ref(false);
const uploadProgress = ref<Record<string, number>>({});
const dropZoneRef = ref<HTMLLabelElement>();
const showMediaPicker = ref(false);

function toItem(x: string | GalleryItem): GalleryItem {
  return typeof x === "string" ? { url: x } : x;
}

const items = computed<GalleryItem[]>(() => model.value.map(toItem));

function wrap(url: string): string | GalleryItem {
  return props.withCaptions ? { url } : url;
}

function appendUrls(urls: string[]) {
  if (!urls.length) return;
  model.value = [...model.value, ...urls.map(wrap)];
}

function onPickMultiple(urls: string[]) {
  appendUrls(urls);
  showMediaPicker.value = false;
}

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: (files) => {
    if (props.disabled || uploading.value || !files?.length) return;
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

  appendUrls(newUrls);

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

function updateCaption(
  index: number,
  field: "title" | "description",
  value: string,
) {
  if (!props.withCaptions) return;
  const current = items.value[index];
  if (!current) return;
  const normalized = value || null;
  if ((current[field] ?? null) === normalized) return;
  const next = [...items.value];
  next[index] = { ...current, [field]: normalized };
  model.value = next;
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="!withCaptions" class="text-xs text-(--ui-text-dimmed)">
      Первое изображение будет использоваться как заглавное в карточке проекта
    </p>

    <!-- Existing images grid -->
    <div
      v-if="items.length"
      :class="[
        'grid gap-3',
        withCaptions
          ? 'grid-cols-1 sm:grid-cols-2'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
      ]"
    >
      <div
        v-for="(item, i) in items"
        :key="`${item.url}-${i}`"
        class="space-y-2"
      >
        <div
          class="group relative aspect-video overflow-hidden rounded-lg border-2"
          :class="!withCaptions && i === 0 ? 'border-(--ui-primary)' : 'border-(--ui-border)'"
        >
          <img :src="item.url" class="h-full w-full object-cover" />
          <span
            v-if="!withCaptions && i === 0"
            class="absolute left-2 top-2 rounded bg-(--ui-primary) px-1.5 py-0.5 text-[10px] font-medium text-(--ui-text-inverted)"
          >
            Заглавная
          </span>
          <button
            v-if="!disabled"
            class="absolute right-2 top-2 rounded-full bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100"
            @click="removeImage(i)"
          >
            <UIcon name="i-solar-close-circle-linear" class="size-4 text-white" />
          </button>
        </div>

        <div v-if="withCaptions" class="space-y-1.5">
          <UInput
            :model-value="item.title ?? ''"
            placeholder="Заголовок (необязательно)"
            size="sm"
            :disabled="disabled"
            class="w-full"
            @update:model-value="(v: string | number) => updateCaption(i, 'title', String(v))"
          />
          <UTextarea
            :model-value="item.description ?? ''"
            placeholder="Описание (необязательно)"
            size="sm"
            :rows="2"
            :disabled="disabled"
            class="w-full"
            @update:model-value="(v: string | number) => updateCaption(i, 'description', String(v))"
          />
        </div>
      </div>
    </div>

    <!-- Upload area with drag & drop -->
    <label
      v-if="!disabled"
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
        name="i-solar-gallery-add-linear"
        class="size-8 text-(--ui-text-muted)"
      />
      <UIcon
        v-else
        name="i-solar-refresh-linear"
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

    <div v-if="!disabled" class="flex justify-center">
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
