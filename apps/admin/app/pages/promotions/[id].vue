<script setup lang="ts">
import type { ContentBlock } from "@zhk/api/shared/blocks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data: promotion, isPending } = useQuery(
  computed(() =>
    $orpc.promotions.getById.queryOptions({
      input: { id: id.value },
    }),
  ),
);

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

const slugManuallyEdited = ref(true);

whenever(promotion, (val) => {
  form.name = val.name;
  form.slug = val.slug ?? "";
  form.description = val.description ?? "";
  form.coverImage = val.coverImage ?? null;
  form.status = val.status;
  form.dateStart = val.dateStart ?? "";
  form.dateEnd = val.dateEnd ?? "";
  form.contentBlocks = (val.contentBlocks as ContentBlock[]) ?? [];
  form.metaTitle = val.metaTitle ?? "";
  form.metaDescription = val.metaDescription ?? "";
  form.ogImage = val.ogImage ?? null;
}, { once: true, immediate: true });

watch(
  () => form.name,
  (val) => {
    if (!slugManuallyEdited.value) {
      form.slug = slugify(val);
    }
  },
);

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.promotions.update({
      id: id.value,
      name: form.name,
      slug: form.slug || null,
      description: form.description || null,
      coverImage: form.coverImage,
      status: form.status,
      dateStart: form.dateStart || null,
      dateEnd: form.dateEnd || null,
      contentBlocks: form.contentBlocks,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      ogImage: form.ogImage,
    }),
  onSuccess: () => {
    toast.add({ title: "Акция обновлена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.promotions.key() });
  },
});

const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.promotions.delete({ id: id.value }),
  onSuccess: () => {
    toast.add({ title: "Акция удалена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.promotions.key() });
    router.push("/promotions");
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

    <template v-else-if="promotion">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/promotions">
            <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
          </NuxtLink>
          <h1 class="text-2xl font-bold">{{ form.name || "Редактирование" }}</h1>
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
    </template>
  </PageContainer>
</template>
