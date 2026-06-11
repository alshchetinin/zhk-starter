<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { allBlocks } from "@zhk/api/shared/blocks";
import type { BlockField } from "@zhk/api/shared/blocks";
import type { BlockMetaForm } from "~/utils/block-schema";
import { buildBlockPayload, isBlockFormValid } from "~/utils/block-schema";

const route = useRoute();
const toast = useToast();
const queryClient = useQueryClient();
const { $orpc, $orpcClient } = useNuxtApp();

const type = String(route.params.type);
const def = allBlocks.find((b) => b.type === type);

if (!def) {
  throw createError({ statusCode: 404, statusMessage: `Блок "${type}" не найден` });
}

const meta = ref<BlockMetaForm>({
  name: def.type,
  label: def.label,
  description: def.description,
  icon: def.icon,
  category: def.category ?? "none",
});

// клон обязателен: BlockSchemaForm мутирует объекты, allBlocks — module-level реестр
const fields = ref<BlockField[]>(structuredClone(def.fields));

const updateMutation = useMutation({
  mutationFn: (payload: ReturnType<typeof buildBlockPayload>) => $orpcClient.dev.blocks.update(payload),
  onSuccess: () => {
    toast.add({ title: "Схема обновлена", description: "Vite HMR подхватит изменения", color: "success" });
  },
  onError: (err: Error) => {
    toast.add({ title: "Ошибка сохранения", description: err.message, color: "error" });
  },
  onSettled: () => {
    // даже при частичном сбое генератор мог изменить файлы на диске
    queryClient.invalidateQueries({ queryKey: $orpc.dev.blocks.key() });
  },
});

const canSubmit = computed(() => isBlockFormValid(meta.value, fields.value));

function submit() {
  updateMutation.mutate(buildBlockPayload(meta.value, fields.value));
}

// --- Превью ---
const previewVersion = ref(0);
const previewBroken = ref(false);
const previewSrc = computed(() => `/block-previews/${type}.png?v=${previewVersion.value}`);

const previewFile = ref<File | null>(null);

const uploadMutation = useMutation({
  mutationFn: (payload: { type: string; dataBase64: string }) =>
    $orpcClient.dev.blocks.uploadPreview(payload),
  onSuccess: () => {
    previewBroken.value = false;
    previewVersion.value += 1;
    previewFile.value = null;
    toast.add({ title: "Превью загружено", color: "success" });
  },
  onError: (err: Error) => {
    previewFile.value = null;
    toast.add({ title: "Ошибка загрузки превью", description: err.message, color: "error" });
  },
});

watch(previewFile, (file) => {
  if (!file) return;
  if (file.size > 3_300_000) {
    toast.add({ title: "PNG больше 3 МБ", color: "error" });
    previewFile.value = null;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataBase64 = String(reader.result).split(",")[1] ?? "";
    uploadMutation.mutate({ type, dataBase64 });
  };
  reader.onerror = () => {
    previewFile.value = null;
    toast.add({ title: "Не удалось прочитать файл", color: "error" });
  };
  reader.readAsDataURL(file);
});
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex items-center gap-2 mb-6">
      <UButton to="/dev/blocks" icon="i-solar-arrow-left-linear" variant="ghost" size="sm" />
      <h1 class="text-2xl font-semibold">{{ def!.label }}</h1>
      <code class="text-xs text-(--ui-text-dimmed) font-mono">{{ type }}</code>
    </div>

    <UAlert
      icon="i-solar-info-circle-linear"
      color="warning"
      variant="soft"
      title="Сохранение перегенерирует файлы"
      description="Определение блока и admin-редактор будут перезаписаны — ручные правки редактора (например, кастомные компоненты) потеряются. Переименованное поле оставит данные страниц под старым ключом. Web-рендерер не затрагивается."
      class="mb-4"
    />

    <div class="p-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) mb-4">
      <h2 class="font-medium mb-3">Превью в пикере</h2>
      <div class="flex items-start gap-4">
        <img
          v-if="!previewBroken"
          :src="previewSrc"
          alt=""
          class="w-48 rounded-md border border-(--ui-border) object-cover"
          @error="previewBroken = true"
        />
        <div
          v-else
          class="w-48 aspect-[16/9] rounded-md border border-dashed border-(--ui-border) flex items-center justify-center"
        >
          <UIcon :name="def!.icon" class="size-8 text-(--ui-text-dimmed)" />
        </div>
        <div class="space-y-2">
          <UFileUpload
            v-model="previewFile"
            accept="image/png"
            variant="button"
            :disabled="uploadMutation.isPending.value"
          />
          <p class="text-xs text-(--ui-text-muted)">
            PNG-скриншот блока (например, из Figma). Сохраняется в
            <code class="font-mono">apps/admin/public/block-previews/{{ type }}.png</code> — закоммить в git.
          </p>
        </div>
      </div>
    </div>

    <BlockSchemaForm mode="edit" v-model:meta="meta" v-model:fields="fields" />

    <div class="flex justify-end gap-2 mt-4">
      <UButton to="/dev/blocks" variant="ghost">Отмена</UButton>
      <UButton
        color="primary"
        :disabled="!canSubmit"
        :loading="updateMutation.isPending.value"
        @click="submit"
      >
        Сохранить схему
      </UButton>
    </div>
  </div>
</template>
