<script setup lang="ts">
import type { ContentBlock } from "@zhk/api/shared/blocks";
import { useMutation } from "@tanstack/vue-query";

const { $orpcClient } = useNuxtApp();
const toast = useToast();
const router = useRouter();

const form = reactive({
  name: "",
  slug: "",
  description: "",
  coverImage: null as string | null,
  status: "draft" as PromotionStatus,
  dateStart: "",
  dateEnd: "",
  contentBlocks: [] as ContentBlock[],
  metaTitle: "",
  metaDescription: "",
  ogImage: null as string | null,
});

const slugManuallyEdited = ref(false);

watch(
  () => form.name,
  (val) => {
    if (!slugManuallyEdited.value) {
      form.slug = slugify(val);
    }
  },
);

const createMutation = useMutation({
  mutationFn: () =>
    $orpcClient.promotions.create({
      name: form.name,
      slug: form.slug || undefined,
      description: form.description || undefined,
      coverImage: form.coverImage ?? undefined,
      status: form.status,
      dateStart: form.dateStart || undefined,
      dateEnd: form.dateEnd || undefined,
      contentBlocks: form.contentBlocks,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      ogImage: form.ogImage ?? undefined,
    }),
  onSuccess: () => {
    toast.add({ title: "Акция создана", color: "success" });
    router.push("/promotions");
  },
});
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/promotions">
          <UButton variant="ghost" icon="i-solar-arrow-left-linear" size="sm" />
        </NuxtLink>
        <h1 class="text-2xl font-bold">Новая акция</h1>
      </div>
      <UButton
        icon="i-solar-diskette-linear"
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
          <UFormField label="Название">
            <UInput
              v-model="form.name"
              placeholder="Название акции"
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

          <UFormField label="Описание">
            <UTextarea
              v-model="form.description"
              placeholder="Описание акции..."
              :rows="3"
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
            <USelect v-model="form.status" :items="promotionStatusOptions" />
          </UFormField>

          <UFormField label="Дата начала">
            <UInput v-model="form.dateStart" type="date" />
          </UFormField>

          <UFormField label="Дата окончания">
            <UInput v-model="form.dateEnd" type="date" />
          </UFormField>
        </div>

        <div
          class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
        >
          <UFormField label="Обложка">
            <ImageUpload
              v-model="form.coverImage"
              folder="promotions/covers"
            />
          </UFormField>
        </div>

        <SeoSidebar
          v-model:meta-title="form.metaTitle"
          v-model:meta-description="form.metaDescription"
          v-model:og-image="form.ogImage"
          folder="promotions/og"
        />
      </div>
    </div>
  </PageContainer>
</template>
