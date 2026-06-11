<script setup lang="ts">
const metaTitle = defineModel<string>("metaTitle", { default: "" });
const metaDescription = defineModel<string>("metaDescription", { default: "" });
const ogImage = defineModel<string | null>("ogImage", { default: null });

const props = withDefaults(
  defineProps<{
    folder?: string;
    showOgImage?: boolean;
  }>(),
  {
    folder: "uploads/og",
    showOgImage: true,
  },
);

const showSeo = ref(false);
</script>

<template>
  <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg)">
    <button
      class="flex items-center justify-between w-full p-4 text-left"
      @click="showSeo = !showSeo"
    >
      <span class="font-semibold">SEO</span>
      <UIcon
        :name="showSeo ? 'i-solar-alt-arrow-up-linear' : 'i-solar-alt-arrow-down-linear'"
        class="size-5 text-(--ui-text-muted)"
      />
    </button>
    <div v-if="showSeo" class="px-6 pb-6 space-y-4">
      <UFormField label="Meta Title">
        <UInput
          v-model="metaTitle"
          placeholder="Заголовок для поисковиков"
        />
      </UFormField>
      <UFormField label="Meta Description">
        <UTextarea
          v-model="metaDescription"
          placeholder="Описание для поисковиков"
          :rows="2"
        />
      </UFormField>
      <UFormField v-if="props.showOgImage" label="OG Image">
        <ImageUpload
          v-model="ogImage"
          :folder="props.folder"
          label="Изображение для соцсетей"
        />
      </UFormField>
    </div>
  </div>
</template>
