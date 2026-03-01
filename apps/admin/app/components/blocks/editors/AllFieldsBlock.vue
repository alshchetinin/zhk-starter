<script setup lang="ts">
import { toolbarItems } from "~/utils/editor-toolbar";

const model = defineModel<{
  title: string;
  subtitle?: string;
  body: string;
  note?: string;
  content: string;
  sortOrder?: number;
  isVisible: boolean;
  link?: string;
  cover: string | null;
  gallery?: string[];
  size: string;
}>({ required: true });

function set<K extends keyof typeof model.value>(key: K, value: typeof model.value[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Заголовок" description="Основной заголовок блока" required>
      <UInput :model-value="model.title" @update:model-value="set('title', $event)" />
    </UFormField>
    <UFormField label="Подзаголовок" description="Дополнительный текст">
      <UInput :model-value="model.subtitle" @update:model-value="set('subtitle', $event)" />
    </UFormField>
    <UFormField label="Текст" description="Многострочное описание" required>
      <UTextarea :model-value="model.body" @update:model-value="set('body', $event)" :rows="4" />
    </UFormField>
    <UFormField label="Примечание" description="Необязательная заметка">
      <UTextarea :model-value="model.note" @update:model-value="set('note', $event)" :rows="4" />
    </UFormField>
    <UFormField label="Контент" description="Форматированный текст" required>
      <UEditor :model-value="model.content" @update:model-value="set('content', $event)" class="min-h-[200px] rounded-md border border-(--ui-border)">
        <template #default="{ editor }">
          <UEditorToolbar :editor="editor" :items="toolbarItems" />
        </template>
      </UEditor>
    </UFormField>
    <UFormField label="Порядок сортировки" description="Числовое значение">
      <UInput :model-value="model.sortOrder" @update:model-value="set('sortOrder', Number($event))" type="number" />
    </UFormField>
    <UFormField label="Видимость" description="Показывать на сайте">
      <USwitch :model-value="model.isVisible" @update:model-value="set('isVisible', $event)" />
    </UFormField>
    <UFormField label="Ссылка" description="URL на внешний ресурс">
      <UInput :model-value="model.link" @update:model-value="set('link', $event)" type="url" placeholder="https://..." />
    </UFormField>
    <UFormField label="Обложка" description="Главное изображение" required>
      <ImageUpload :model-value="model.cover" @update:model-value="set('cover', $event)" folder="blocks" />
    </UFormField>
    <UFormField label="Галерея" description="Дополнительные изображения">
      <GalleryUpload :model-value="model.gallery" @update:model-value="set('gallery', $event)" />
    </UFormField>
    <UFormField label="Размер" description="Размер отображения" required>
      <USelect :model-value="model.size" @update:model-value="set('size', $event)" class="w-full" :items="[{ label: 'small', value: 'small' }, { label: 'medium', value: 'medium' }, { label: 'large', value: 'large' }]" />
    </UFormField>
  </div>
</template>
