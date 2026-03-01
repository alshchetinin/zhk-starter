<script setup lang="ts">
import type { ContentBlock } from "@zhk/api/shared/blocks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data: pageData, isPending } = useQuery(
  computed(() =>
    $orpc.pages.getById.queryOptions({
      input: { id: id.value },
    }),
  ),
);

const form = reactive({
  title: "",
  slug: "",
  status: "draft" as PageStatus,
  contentBlocks: [] as ContentBlock[],
  metaTitle: "",
  metaDescription: "",
  ogImage: null as string | null,
});

const slugManuallyEdited = ref(true);

whenever(pageData, (val) => {
  form.title = val.title;
  form.slug = val.slug;
  form.status = val.status;
  form.contentBlocks = (val.contentBlocks as ContentBlock[]) ?? [];
  form.metaTitle = val.metaTitle ?? "";
  form.metaDescription = val.metaDescription ?? "";
  form.ogImage = val.ogImage ?? null;
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
    $orpcClient.pages.update({
      id: id.value,
      title: form.title,
      slug: form.slug,
      status: form.status,
      contentBlocks: form.contentBlocks,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      ogImage: form.ogImage,
    }),
  onSuccess: () => {
    toast.add({ title: "Страница обновлена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.pages.key() });
  },
});

const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.pages.delete({ id: id.value }),
  onSuccess: () => {
    toast.add({ title: "Страница удалена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.pages.key() });
    router.push("/pages");
  },
});
</script>

<template>
  <PageContainer>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-(--ui-text-muted)"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <template v-else-if="pageData">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/pages">
            <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
          </NuxtLink>
          <h1 class="text-2xl font-bold">{{ form.title || "Редактирование" }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            color="error"
            icon="i-tabler-trash"
            class="rounded-xl"
            :loading="deleteMutation.isPending.value"
            @click="deleteMutation.mutate()"
          >
            Удалить
          </UButton>
          <UButton
            icon="i-tabler-device-floppy"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
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
                placeholder="Заголовок страницы"
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
              <USelect v-model="form.status" :items="pageStatusOptions" />
            </UFormField>
          </div>

          <SeoSidebar
            v-model:meta-title="form.metaTitle"
            v-model:meta-description="form.metaDescription"
            v-model:og-image="form.ogImage"
            folder="pages/og"
          />
        </div>
      </div>
    </template>
  </PageContainer>
</template>
