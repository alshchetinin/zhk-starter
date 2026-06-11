<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { GalleryItem } from "~/types/gallery";

const cleanUrl = (v: string | null | undefined) => v?.trim() || null;

const FALLBACK_LOCKED = [
  "name",
  "area",
  "roomsCount",
  "floorRange",
  "priceRange",
  "defaultLayoutImage",
  "threeDLayoutImage",
  "ceilingHeight",
];

const FIELD_LABELS: Record<string, string> = {
  name: "Название",
  area: "Площадь",
  roomsCount: "Комнат",
  floorRange: "Этажи",
  priceRange: "Цена",
  defaultLayoutImage: "Изображение планировки",
  threeDLayoutImage: "3D-изображение",
  furnishedLayoutImage: "С мебелью",
  ceilingHeight: "Высота потолка",
  sunPosition: "Положение солнца",
  tags: "Теги",
};

const { $orpc, $orpcClient } = useNuxtApp();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const queryClient = useQueryClient();
const id = computed(() => route.params.id as string);

const { data: layout, isPending } = useQuery(
  computed(() =>
    $orpc.apartmentLayouts.getById.queryOptions({ input: { id: id.value } }),
  ),
);

const lockedFields = computed<string[]>(() => {
  const l = layout.value;
  if (!l?.integrationId) return [];
  return l.syncedFields ?? FALLBACK_LOCKED;
});

function isLocked(key: string) {
  return lockedFields.value.includes(key);
}

const lockedLabels = computed(() =>
  lockedFields.value.map((k) => FIELD_LABELS[k] ?? k),
);

type Form = {
  name: string;
  area: number | null;
  roomsCount: number | null;
  floorRange: string;
  priceRange: string;
  defaultLayoutImage: string | null;
  furnishedLayoutImage: string | null;
  threeDLayoutImage: string | null;
  threeDTourUrl: string | null;
  ceilingHeight: number | null;
  gallery: GalleryItem[];
  tagIds: string[];
};

const form = reactive<Form>({
  name: "",
  area: null,
  roomsCount: null,
  floorRange: "",
  priceRange: "",
  defaultLayoutImage: null,
  furnishedLayoutImage: null,
  threeDLayoutImage: null,
  threeDTourUrl: null,
  ceilingHeight: null,
  gallery: [],
  tagIds: [],
});

watch(
  layout,
  (l) => {
    if (!l) return;
    form.name = l.name;
    form.area = l.area != null ? Number(l.area) : null;
    form.roomsCount = l.roomsCount;
    form.floorRange = l.floorRange ?? "";
    form.priceRange = l.priceRange ?? "";
    form.defaultLayoutImage = l.defaultLayoutImage ?? null;
    form.furnishedLayoutImage = l.furnishedLayoutImage ?? null;
    form.threeDLayoutImage = l.threeDLayoutImage ?? null;
    form.threeDTourUrl = (l as { threeDTourUrl?: string | null }).threeDTourUrl ?? null;
    form.ceilingHeight = l.ceilingHeight != null ? Number(l.ceilingHeight) : null;
    form.gallery = (l.gallery as GalleryItem[] | null) ?? [];
    form.tagIds = (l.tags ?? []).map((t: { tagId: string }) => t.tagId);
  },
  { immediate: true },
);

const updateMutation = useMutation({
  mutationFn: () => {
    const payload: Record<string, unknown> = { id: id.value };
    const editable = (k: keyof Form) => !isLocked(k as string);

    if (editable("name")) payload.name = form.name;
    if (editable("area") && form.area != null) payload.area = form.area;
    if (editable("roomsCount") && form.roomsCount != null)
      payload.roomsCount = form.roomsCount;
    if (editable("floorRange")) payload.floorRange = form.floorRange || null;
    if (editable("priceRange")) payload.priceRange = form.priceRange || null;
    if (editable("defaultLayoutImage"))
      payload.defaultLayoutImage = form.defaultLayoutImage;
    if (editable("threeDLayoutImage"))
      payload.threeDLayoutImage = form.threeDLayoutImage;
    payload.threeDTourUrl = cleanUrl(form.threeDTourUrl);
    payload.furnishedLayoutImage = form.furnishedLayoutImage;
    if (editable("ceilingHeight"))
      payload.ceilingHeight = form.ceilingHeight ?? null;
    payload.gallery = form.gallery;

    return $orpcClient.apartmentLayouts.update(payload as any);
  },
  onMutate: async () => {
    const key = $orpc.apartmentLayouts.getById.queryKey({
      input: { id: id.value },
    });
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData(key);
    queryClient.setQueryData(key, (old: any) =>
      old
        ? {
            ...old,
            name: form.name,
            area: form.area != null ? String(form.area) : old.area,
            roomsCount: form.roomsCount ?? old.roomsCount,
            floorRange: form.floorRange || null,
            priceRange: form.priceRange || null,
            defaultLayoutImage: form.defaultLayoutImage,
            furnishedLayoutImage: form.furnishedLayoutImage,
            threeDLayoutImage: form.threeDLayoutImage,
            threeDTourUrl: cleanUrl(form.threeDTourUrl),
            ceilingHeight:
              form.ceilingHeight != null ? String(form.ceilingHeight) : null,
            gallery: form.gallery,
          }
        : old,
    );
    return { previous, key };
  },
  onError: (err, _vars, ctx) => {
    if (ctx?.previous) queryClient.setQueryData(ctx.key, ctx.previous);
    toast.add({
      title: "Не удалось сохранить",
      description: (err as Error).message,
      color: "error",
    });
  },
  onSuccess: () => {
    toast.add({ title: "Планировка сохранена", color: "success" });
    router.push(`/layouts/${id.value}`);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: $orpc.apartmentLayouts.key() });
  },
});

const saveTagsMutation = useMutation({
  mutationFn: () =>
    $orpcClient.tags.setLayoutTags({
      layoutId: id.value,
      tagIds: form.tagIds,
    }),
  onSuccess: () => {
    toast.add({ title: "Теги сохранены", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.apartmentLayouts.key() });
  },
  onError: (err: Error) => {
    toast.add({
      title: "Не удалось сохранить теги",
      description: err.message,
      color: "error",
    });
  },
});
</script>

<template>
  <PageContainer>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
      Загрузка…
    </div>

    <template v-else-if="layout">
      <AppPageHeader
        :title="`Редактировать · ${layout.name}`"
        :back="`/layouts/${id}`"
        :crumbs="[
          { label: 'Планировки', to: '/layouts' },
          { label: layout.name, to: `/layouts/${id}` },
          { label: 'Редактирование' },
        ]"
      >
        <template #actions>
          <UButton
            variant="ghost"
            :to="`/layouts/${id}`"
            icon="i-solar-close-circle-linear"
            label="Отмена"
          />
          <UButton
            color="primary"
            icon="i-solar-diskette-linear"
            label="Сохранить"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
          />
        </template>
      </AppPageHeader>

      <UAlert
        v-if="lockedFields.length"
        color="warning"
        variant="subtle"
        icon="i-solar-refresh-linear"
        :title="`Эти поля обновляются интеграцией${layout.integration?.type ? ` «${layout.integration.type}»` : ''} и недоступны для ручной правки`"
        :description="lockedLabels.join(', ')"
        class="mb-4"
      />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div class="lg:col-span-2 space-y-3">
          <AppDataCard title="Основное">
            <div class="space-y-3">
              <UFormField label="Название" required>
                <UInput
                  v-model="form.name"
                  :disabled="isLocked('name')"
                  class="w-full"
                />
              </UFormField>

              <div class="grid grid-cols-2 gap-3">
                <UFormField label="Площадь, м²" required>
                  <UInput
                    v-model.number="form.area"
                    type="number"
                    step="0.01"
                    :disabled="isLocked('area')"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Комнат" required>
                  <UInput
                    v-model.number="form.roomsCount"
                    type="number"
                    :disabled="isLocked('roomsCount')"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <UFormField label="Этажи">
                  <UInput
                    v-model="form.floorRange"
                    placeholder="2–10"
                    :disabled="isLocked('floorRange')"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Цена">
                  <UInput
                    v-model="form.priceRange"
                    placeholder="от 5 000 000"
                    :disabled="isLocked('priceRange')"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UFormField label="Высота потолка, м">
                <UInput
                  v-model.number="form.ceilingHeight"
                  type="number"
                  step="0.01"
                  :disabled="isLocked('ceilingHeight')"
                  class="w-full"
                />
              </UFormField>
            </div>
          </AppDataCard>

          <AppDataCard title="Дополнительные изображения с подписями">
            <GalleryUpload
              v-model="form.gallery"
              with-captions
              folder="uploads/layouts"
            />
          </AppDataCard>

          <AppDataCard title="Теги">
            <p class="text-xs text-(--ui-text-dimmed) mb-2">
              Импортные теги управляются синхронизацией. Здесь можно
              привязать или отвязать ручные теги.
            </p>
            <TagsPicker v-model="form.tagIds" lock-imported />
            <div class="mt-3 flex justify-end">
              <UButton
                size="sm"
                variant="soft"
                icon="i-solar-diskette-linear"
                :loading="saveTagsMutation.isPending.value"
                @click="saveTagsMutation.mutate()"
              >
                Сохранить теги
              </UButton>
            </div>
          </AppDataCard>
        </div>

        <div class="space-y-3">
          <AppDataCard title="Изображение планировки">
            <ImageUpload
              v-if="!isLocked('defaultLayoutImage')"
              v-model="form.defaultLayoutImage"
              folder="uploads/layouts"
            />
            <div v-else class="space-y-2">
              <img
                v-if="form.defaultLayoutImage"
                :src="form.defaultLayoutImage"
                class="w-full rounded-lg bg-(--ui-bg-elevated)"
              />
              <p v-else class="text-xs text-(--ui-text-dimmed)">Нет изображения</p>
            </div>
          </AppDataCard>

          <AppDataCard title="С мебелью">
            <ImageUpload
              v-model="form.furnishedLayoutImage"
              folder="uploads/layouts"
            />
          </AppDataCard>

          <AppDataCard title="3D-тур">
            <div class="space-y-3">
              <UFormField label="URL виджета (iframe)">
                <UInput
                  :model-value="form.threeDTourUrl ?? ''"
                  type="url"
                  placeholder="https://…"
                  class="w-full"
                  @update:model-value="(v: string | number) => (form.threeDTourUrl = String(v) || null)"
                />
              </UFormField>
              <div
                v-if="form.threeDTourUrl"
                class="aspect-video rounded-lg overflow-hidden border border-(--ui-border) bg-(--ui-bg-elevated)"
              >
                <iframe
                  :src="form.threeDTourUrl"
                  class="w-full h-full"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                  allow="fullscreen; xr-spatial-tracking"
                />
              </div>
            </div>

            <details class="mt-4">
              <summary
                class="text-xs text-(--ui-text-dimmed) cursor-pointer hover:text-(--ui-text-muted)"
              >
                3D-изображение (legacy)
              </summary>
              <div class="mt-2">
                <ImageUpload
                  v-if="!isLocked('threeDLayoutImage')"
                  v-model="form.threeDLayoutImage"
                  folder="uploads/layouts"
                />
                <div v-else class="space-y-2">
                  <img
                    v-if="form.threeDLayoutImage"
                    :src="form.threeDLayoutImage"
                    class="w-full rounded-lg bg-(--ui-bg-elevated)"
                  />
                  <p v-else class="text-xs text-(--ui-text-dimmed)">Нет изображения</p>
                </div>
              </div>
            </details>
          </AppDataCard>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
