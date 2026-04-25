<script setup lang="ts">
import type { ContentBlock } from "@zhk/api/shared/blocks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data: document, isPending } = useQuery(
  computed(() =>
    $orpc.documents.getById.queryOptions({
      input: { id: id.value },
    }),
  ),
);

const form = reactive({
  title: "",
  slug: "",
  status: "draft" as DocumentStatus,
  sortOrder: 0,
  contentBlocks: [] as ContentBlock[],
  metaTitle: "",
  metaDescription: "",
});

const slugManuallyEdited = ref(true);

whenever(document, (val) => {
  form.title = val.title;
  form.slug = val.slug;
  form.status = val.status;
  form.sortOrder = val.sortOrder;
  form.contentBlocks = (val.contentBlocks as ContentBlock[]) ?? [];
  form.metaTitle = val.metaTitle ?? "";
  form.metaDescription = val.metaDescription ?? "";
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
    $orpcClient.documents.update({
      id: id.value,
      title: form.title,
      slug: form.slug,
      status: form.status,
      sortOrder: form.sortOrder,
      contentBlocks: form.contentBlocks,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
    }),
  onSuccess: () => {
    toast.add({ title: "Документ обновлён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.documents.key() });
  },
});

const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.documents.delete({ id: id.value }),
  onSuccess: () => {
    toast.add({ title: "Документ удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.documents.key() });
    router.push("/documents");
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

    <template v-else-if="document">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/documents">
            <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
          </NuxtLink>
          <h1 class="text-2xl font-bold">{{ form.title || "Редактирование" }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            color="error"
            icon="i-tabler-trash"
            class="rounded-md"
            :loading="deleteMutation.isPending.value"
            @click="deleteMutation.mutate()"
          >
            Удалить
          </UButton>
          <UButton
            icon="i-tabler-device-floppy"
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
    </template>
  </PageContainer>
</template>
