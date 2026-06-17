<script setup lang="ts">
import type { BreadcrumbsConfig } from "@zhk/api/shared/breadcrumbs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const props = defineProps<{ project: any }>();

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();
const router = useRouter();

const { data: cities } = useQuery($orpc.cities.list.queryOptions());

const cityOptions = computed(() =>
  (cities.value ?? []).map((c: any) => ({ value: c.id, label: c.name })),
);

const form = reactive({
  name: props.project.name ?? "",
  address: props.project.address ?? "",
  cityId: props.project.cityId as string | null,
  type: props.project.type ?? "",
  location: props.project.location ?? "",
  tags: [...(props.project.tags ?? [])] as string[],
  coordinates: props.project.coordinates ?? "",
  gallery: [...(props.project.gallery ?? [])] as string[],
  cameraUrl: props.project.cameraUrl ?? "",
  breadcrumbs: (props.project.breadcrumbs ?? emptyBreadcrumbs()) as BreadcrumbsConfig,
});

const canSave = computed(() => form.name.trim().length > 0);

const saveMutation = useMutation({
  mutationFn: () =>
    $orpcClient.projects.update({
      id: props.project.id,
      name: form.name.trim(),
      address: form.address.trim(),
      type: form.type.trim() || null,
      cityId: form.cityId || null,
      location: form.location.trim() || null,
      tags: form.tags.length > 0 ? form.tags : null,
      coordinates: form.coordinates || null,
      gallery: form.gallery.length > 0 ? form.gallery : null,
      cameraUrl: form.cameraUrl.trim() || null,
      breadcrumbs: cleanBreadcrumbs(form.breadcrumbs),
    }),
  onMutate: async () => {
    const key = $orpc.projects.getById.queryKey({
      input: { id: props.project.id },
    });
    await queryClient.cancelQueries({ queryKey: key });
    const prev = queryClient.getQueryData(key);
    queryClient.setQueryData(
      key,
      (old: any) =>
        old && {
          ...old,
          name: form.name.trim(),
          address: form.address.trim(),
          type: form.type.trim() || null,
          cityId: form.cityId || null,
          location: form.location.trim() || null,
          tags: form.tags.length > 0 ? form.tags : null,
          coordinates: form.coordinates || null,
          gallery: form.gallery.length > 0 ? form.gallery : null,
          cameraUrl: form.cameraUrl.trim() || null,
          breadcrumbs: cleanBreadcrumbs(form.breadcrumbs),
        },
    );
    return { prev, key };
  },
  onError: (_e, _v, ctx) => {
    if (ctx) queryClient.setQueryData(ctx.key, ctx.prev);
  },
  onSuccess: () => {
    toast.add({ title: "Проект обновлён", color: "success" });
    router.push(`/projects/${props.project.id}`);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: $orpc.projects.key() });
  },
});
</script>

<template>
  <div class="max-w-3xl space-y-3">
    <AppDataCard title="Основная информация">
      <div class="space-y-4">
        <UFormField label="Название" required>
          <UInput
            v-model="form.name"
            placeholder="ЖК Солнечный"
            icon="i-solar-buildings-linear"
            size="sm"
          />
        </UFormField>
        <UFormField label="Адрес">
          <UInput
            v-model="form.address"
            placeholder="ул. Примерная, 1"
            icon="i-solar-map-point-linear"
            size="sm"
          />
        </UFormField>
        <UFormField label="Город">
          <USelect
            v-model="form.cityId"
            :items="cityOptions"
            placeholder="Выберите город"
            size="sm"
          />
        </UFormField>
        <UFormField label="Тип">
          <UInput
            v-model="form.type"
            placeholder="Жилой комплекс"
            icon="i-solar-tag-linear"
            size="sm"
          />
        </UFormField>
        <UFormField label="Локация (район / микрорайон)">
          <UInput
            v-model="form.location"
            placeholder="Приморский район"
            icon="i-solar-map-linear"
            size="sm"
          />
        </UFormField>
      </div>
    </AppDataCard>

    <AppDataCard title="Теги">
      <TagInput v-model="form.tags" />
    </AppDataCard>

    <AppDataCard title="Координаты">
      <YandexMapPicker v-model="form.coordinates" />
    </AppDataCard>

    <AppDataCard title="Галерея">
      <GalleryUpload v-model="form.gallery" :project-id="project.id" />
    </AppDataCard>

    <AppDataCard title="Онлайн-камера">
      <UFormField
        label="Ссылка на трансляцию"
        description="Камера стройки для всего проекта"
      >
        <UInput
          v-model="form.cameraUrl"
          placeholder="https://..."
          icon="i-solar-videocamera-linear"
          size="sm"
        />
      </UFormField>
    </AppDataCard>

    <AppDataCard title="Хлебные крошки">
      <BreadcrumbsField v-model="form.breadcrumbs" />
    </AppDataCard>

    <div class="flex items-center gap-2 pt-2">
      <UButton
        color="primary"
        icon="i-solar-diskette-linear"
        :disabled="!canSave"
        :loading="saveMutation.isPending.value"
        @click="saveMutation.mutate()"
      >
        Сохранить
      </UButton>
      <UButton
        variant="outline"
        @click="router.push(`/projects/${project.id}`)"
      >
        Отмена
      </UButton>
    </div>
  </div>
</template>
