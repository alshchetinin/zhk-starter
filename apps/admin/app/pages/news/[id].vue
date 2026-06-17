<script setup lang="ts">
import type { ContentBlock } from "@zhk/api/shared/blocks";
import type { BreadcrumbsConfig } from "@zhk/api/shared/breadcrumbs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data: article, isPending } = useQuery(
  computed(() =>
    $orpc.news.getById.queryOptions({
      input: { id: id.value },
    }),
  ),
);

useHead({ title: computed(() => article.value?.title) });

const form = reactive({
  title: "",
  slug: "",
  excerpt: "",
  coverImage: null as string | null,
  status: "draft" as NewsStatus,
  publishedAt: "",
  contentBlocks: [] as ContentBlock[],
  metaTitle: "",
  metaDescription: "",
  ogImage: null as string | null,
  breadcrumbs: emptyBreadcrumbs() as BreadcrumbsConfig,
});

const slugManuallyEdited = ref(true);

whenever(article, (val) => {
  form.title = val.title;
  form.slug = val.slug;
  form.excerpt = val.excerpt ?? "";
  form.coverImage = val.coverImage ?? null;
  form.status = val.status;
  form.publishedAt = val.publishedAt
    ? new Date(val.publishedAt).toISOString().slice(0, 16)
    : "";
  form.contentBlocks = (val.contentBlocks as ContentBlock[]) ?? [];
  form.metaTitle = val.metaTitle ?? "";
  form.metaDescription = val.metaDescription ?? "";
  form.ogImage = val.ogImage ?? null;
  form.breadcrumbs = (val.breadcrumbs as BreadcrumbsConfig) ?? emptyBreadcrumbs();
}, { once: true, immediate: true });

watch(
  () => form.title,
  (val) => {
    if (!slugManuallyEdited.value) {
      form.slug = slugify(val);
    }
  },
);

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.news.update({
      id: id.value,
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt || null,
      coverImage: form.coverImage,
      status: form.status,
      publishedAt: form.publishedAt
        ? new Date(form.publishedAt).toISOString()
        : null,
      contentBlocks: form.contentBlocks,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      ogImage: form.ogImage,
      breadcrumbs: cleanBreadcrumbs(form.breadcrumbs),
    }),
  onMutate: async () => {
    const key = $orpc.news.getById.queryKey({ input: { id: id.value } });
    await queryClient.cancelQueries({ queryKey: key });
    const prev = queryClient.getQueryData(key);
    queryClient.setQueryData(key, (old: any) =>
      old && {
        ...old,
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt || null,
        coverImage: form.coverImage,
        status: form.status,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
        contentBlocks: form.contentBlocks,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        ogImage: form.ogImage,
        breadcrumbs: cleanBreadcrumbs(form.breadcrumbs),
      },
    );
    return { prev, key };
  },
  onError: (_e, _v, ctx) => {
    if (ctx) queryClient.setQueryData(ctx.key, ctx.prev);
  },
  onSuccess: () => {
    toast.add({ title: "Статья обновлена", color: "success" });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: $orpc.news.key() });
  },
});

const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.news.delete({ id: id.value }),
  onSuccess: () => {
    toast.add({ title: "Статья удалена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.news.key() });
    router.push("/news");
  },
});
</script>

<template>
  <PageContainer>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-(--ui-text-muted)"
    >
      <UIcon name="i-solar-refresh-linear" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <template v-else-if="article">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/news">
            <UButton variant="ghost" icon="i-solar-arrow-left-linear" size="sm" />
          </NuxtLink>
          <h1 class="text-2xl font-bold">{{ form.title || "Редактирование" }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            color="error"
            icon="i-solar-trash-bin-trash-linear"
           
            :loading="deleteMutation.isPending.value"
            @click="deleteMutation.mutate()"
          >
            Удалить
          </UButton>
          <UButton
            icon="i-solar-diskette-linear"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted)"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </UButton>
        </div>
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
                placeholder="Заголовок статьи"
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

            <UFormField label="Краткое описание">
              <UTextarea
                v-model="form.excerpt"
                placeholder="Краткое описание для списка и SEO..."
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
              <USelect v-model="form.status" :items="newsStatusOptions" />
            </UFormField>

            <UFormField label="Дата публикации">
              <UInput v-model="form.publishedAt" type="datetime-local" />
            </UFormField>
          </div>

          <div
            class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
          >
            <UFormField label="Обложка">
              <ImageUpload
                v-model="form.coverImage"
                folder="news/covers"
              />
            </UFormField>
          </div>

          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4">
            <h3 class="text-sm font-semibold">Хлебные крошки</h3>
            <BreadcrumbsField v-model="form.breadcrumbs" />
          </div>

          <SeoSidebar
            v-model:meta-title="form.metaTitle"
            v-model:meta-description="form.metaDescription"
            v-model:og-image="form.ogImage"
            folder="news/og"
          />
        </div>
      </div>
    </template>
  </PageContainer>
</template>
