<script setup lang="ts">
import type { ContentBlock } from "@zhk/api/shared/blocks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data, isPending: loading } = useQuery(
  $orpc.homepage.get.queryOptions(),
);

const form = reactive({
  contentBlocks: [] as ContentBlock[],
  metaTitle: "",
  metaDescription: "",
  ogImage: null as string | null,
});

whenever(data, (val) => {
  if (!val) return;
  form.contentBlocks = (val.contentBlocks as ContentBlock[]) ?? [];
  form.metaTitle = val.metaTitle ?? "";
  form.metaDescription = val.metaDescription ?? "";
  form.ogImage = val.ogImage ?? null;
}, { once: true, immediate: true });

const showPreview = ref(false);

const saveMutation = useMutation({
  mutationFn: () =>
    $orpcClient.homepage.save({
      contentBlocks: form.contentBlocks,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      ogImage: form.ogImage,
    }),
  onSuccess: () => {
    toast.add({ title: "Главная страница сохранена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.homepage.key() });
  },
  onError: () => {
    toast.add({ title: "Ошибка сохранения", color: "error" });
  },
});
</script>

<template>
  <PageContainer>
    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-tabler-loader-2" class="animate-spin text-3xl" />
    </div>

    <template v-else>
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">
            Главная страница
          </h1>
          <p class="text-(--ui-text-muted) text-sm mt-1">
            Контент и SEO главной страницы сайта
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            :variant="showPreview ? 'solid' : 'outline'"
            icon="i-tabler-eye"
            class="rounded-xl"
            @click="showPreview = !showPreview"
          >
            Превью
          </UButton>
          <UButton
            :loading="saveMutation.isPending.value"
            icon="i-tabler-device-floppy"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
            @click="saveMutation.mutate()"
          >
            Сохранить
          </UButton>
        </div>
      </div>

      <div
        class="grid grid-cols-1 gap-3"
        :class="showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-3'"
      >
        <!-- Main content -->
        <div class="space-y-3" :class="showPreview ? '' : 'lg:col-span-2'">
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
            <h3 class="text-lg font-semibold mb-4">Контент</h3>
            <BlockDynamicZone v-model="form.contentBlocks" />
          </div>
        </div>

        <!-- Sidebar: preview OR seo -->
        <div v-if="showPreview" class="sticky top-3 h-[calc(100svh-2rem)]">
          <BlockPreviewPanel :blocks="form.contentBlocks" />
        </div>
        <div v-else class="space-y-3">
          <SeoSidebar
            v-model:meta-title="form.metaTitle"
            v-model:meta-description="form.metaDescription"
            v-model:og-image="form.ogImage"
            folder="homepage/og"
          />
          <ContentHistoryPanel
            v-if="data?.id"
            entity-type="homepage"
            :entity-id="data.id"
            :current-snapshot="{
              contentBlocks: form.contentBlocks,
              metaTitle: form.metaTitle,
              metaDescription: form.metaDescription,
              ogImage: form.ogImage,
            }"
            @restore="(snap: any) => {
              form.contentBlocks = snap.contentBlocks ?? [];
              form.metaTitle = snap.metaTitle ?? '';
              form.metaDescription = snap.metaDescription ?? '';
              form.ogImage = snap.ogImage ?? null;
            }"
          />
        </div>
      </div>
    </template>
  </PageContainer>
</template>
