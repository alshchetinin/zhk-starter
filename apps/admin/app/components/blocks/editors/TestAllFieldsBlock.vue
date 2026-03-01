<script setup lang="ts">
const model = defineModel<{
  title: string;
  description: string;
  content: string;
  count: number;
  isActive: boolean;
  link: string;
  cover: string | null;
  gallery: string[];
  variant: string;
}>({ required: true });

const toolbarItems = [
  [
    { kind: "heading" as const, level: 1, icon: "i-tabler-h-1", tooltip: { text: "Заголовок 1" } },
    { kind: "heading" as const, level: 2, icon: "i-tabler-h-2", tooltip: { text: "Заголовок 2" } },
    { kind: "heading" as const, level: 3, icon: "i-tabler-h-3", tooltip: { text: "Заголовок 3" } },
  ],
  [
    { kind: "mark" as const, mark: "bold", icon: "i-tabler-bold", tooltip: { text: "Жирный" } },
    { kind: "mark" as const, mark: "italic", icon: "i-tabler-italic", tooltip: { text: "Курсив" } },
    { kind: "mark" as const, mark: "strike", icon: "i-tabler-strikethrough", tooltip: { text: "Зачёркнутый" } },
  ],
  [
    { kind: "bulletList" as const, icon: "i-tabler-list", tooltip: { text: "Маркированный список" } },
    { kind: "orderedList" as const, icon: "i-tabler-list-numbers", tooltip: { text: "Нумерованный список" } },
  ],
  [
    { kind: "blockquote" as const, icon: "i-tabler-blockquote", tooltip: { text: "Цитата" } },
    { kind: "link" as const, icon: "i-tabler-link", tooltip: { text: "Ссылка" } },
  ],
  [
    { kind: "undo" as const, icon: "i-tabler-arrow-back-up", tooltip: { text: "Отменить" } },
    { kind: "redo" as const, icon: "i-tabler-arrow-forward-up", tooltip: { text: "Повторить" } },
  ],
];
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Заголовок (string)">
      <UInput v-model="model.title" />
    </UFormField>
    <UFormField label="Описание (textarea)">
      <UTextarea v-model="model.description" :rows="4" />
    </UFormField>
    <UFormField label="Контент (rich text)">
      <UEditor v-model="model.content" class="min-h-[200px] rounded-md border border-(--ui-border)">
        <template #default="{ editor }">
          <UEditorToolbar :editor="editor" :items="toolbarItems" />
        </template>
      </UEditor>
    </UFormField>
    <UFormField label="Количество (number)">
      <UInput v-model.number="model.count" type="number" />
    </UFormField>
    <UFormField label="Активен (boolean)">
      <USwitch v-model="model.isActive" />
    </UFormField>
    <UFormField label="Ссылка (url)">
      <UInput v-model="model.link" type="url" placeholder="https://..." />
    </UFormField>
    <UFormField label="Обложка (image)">
      <ImageUpload v-model="model.cover" folder="blocks" />
    </UFormField>
    <UFormField label="Галерея (images)">
      <GalleryUpload v-model="model.gallery" />
    </UFormField>
    <UFormField label="Вариант (select)">
      <USelect v-model="model.variant" class="w-full" :items="[{ label: 'small', value: 'small' }, { label: 'medium', value: 'medium' }, { label: 'large', value: 'large' }]" />
    </UFormField>
  </div>
</template>
