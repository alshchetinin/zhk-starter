<script setup lang="ts">
import type { ContentBlock } from "@zhk/api/shared/blocks";
import { useMutation } from "@tanstack/vue-query";

const { $orpcClient } = useNuxtApp();
const toast = useToast();
const router = useRouter();

const form = reactive({
  title: "",
  slug: "",
  status: "draft" as DocumentStatus,
  sortOrder: 0,
  contentBlocks: [] as ContentBlock[],
  metaTitle: "",
  metaDescription: "",
});

const slugManuallyEdited = ref(false);

watch(
  () => form.title,
  (val) => {
    if (!slugManuallyEdited.value) {
      form.slug = slugify(val);
    }
  },
);

const createMutation = useMutation({
  mutationFn: () =>
    $orpcClient.documents.create({
      title: form.title,
      slug: form.slug,
      status: form.status,
      sortOrder: form.sortOrder,
      contentBlocks: form.contentBlocks,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
    }),
  onSuccess: () => {
    toast.add({ title: "Документ создан", color: "success" });
    router.push("/documents");
  },
});
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/documents">
          <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
        </NuxtLink>
        <h1 class="text-2xl font-bold">Новый документ</h1>
      </div>
      <UButton
        icon="i-tabler-device-floppy"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted)"
        :loading="createMutation.isPending.value"
        @click="createMutation.mutate()"
      >
        Сохранить
      </UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <!-- Main content -->
      <div class="lg:col-span-2 space-y-3">
        <div
          class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
        >
          <UFormField label="Заголовок">
            <UInput
              v-model="form.title"
              placeholder="Заголовок документа"
              size="lg"
            />
          </UFormField>

          <UFormField label="Slug">
            <UInput
              v-model="form.slug"
              placeholder="url-slug"
              @input="slugManuallyEdited = true"
            />
          </UFormField>
        </div>

        <!-- Dynamic zone -->
        <div
          class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6"
        >
          <h3 class="text-lg font-semibold mb-4">Контент</h3>
          <BlockDynamicZone v-model="form.contentBlocks" />
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-3">
        <div
          class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
        >
          <UFormField label="Статус">
            <USelect v-model="form.status" :items="documentStatusOptions" />
          </UFormField>

          <UFormField label="Порядок сортировки">
            <UInput
              v-model.number="form.sortOrder"
              type="number"
            />
          </UFormField>
        </div>

        <SeoSidebar
          v-model:meta-title="form.metaTitle"
          v-model:meta-description="form.metaDescription"
          :show-og-image="false"
        />
      </div>
    </div>
  </PageContainer>
</template>
