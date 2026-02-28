<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const props = defineProps<{
  project: any;
}>();

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();
const router = useRouter();

// Cities for select
const { data: cities } = useQuery($orpc.cities.list.queryOptions());

const cityOptions = computed(() =>
  (cities.value ?? []).map((c: any) => ({ value: c.id, label: c.name })),
);

// Form state initialized from project
const form = reactive({
  name: props.project.name ?? "",
  address: props.project.address ?? "",
  cityId: props.project.cityId as string | null,
  type: props.project.type ?? "",
  location: props.project.location ?? "",
  tags: [...(props.project.tags ?? [])] as string[],
  coordinates: props.project.coordinates ?? "",
  gallery: [...(props.project.gallery ?? [])] as string[],
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
    }),
  onSuccess: () => {
    toast.add({ title: "Проект обновлён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.projects.key() });
    router.push(`/projects/${props.project.id}`);
  },
  onError: (error: any) => {
    toast.add({
      title: "Ошибка сохранения",
      description: error.message,
      color: "error",
    });
  },
});
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <!-- Basic Info -->
    <div class="space-y-5 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
      <h2 class="text-lg font-semibold">Основная информация</h2>

      <UFormField label="Название">
        <UInput
          v-model="form.name"
          placeholder="ЖК Солнечный"
          icon="i-tabler-building"
          size="xl"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Адрес">
        <UInput
          v-model="form.address"
          placeholder="ул. Примерная, 1"
          icon="i-tabler-map-pin"
          size="xl"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Город">
        <USelect
          v-model="form.cityId"
          :items="cityOptions"
          placeholder="Выберите город"
          size="xl"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Тип">
        <UInput
          v-model="form.type"
          placeholder="Жилой комплекс"
          icon="i-tabler-tag"
          size="xl"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Локация (район / микрорайон)">
        <UInput
          v-model="form.location"
          placeholder="Приморский район"
          icon="i-tabler-map-2"
          size="xl"
          class="w-full"
        />
      </UFormField>
    </div>

    <!-- Tags -->
    <div class="space-y-5 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
      <h2 class="text-lg font-semibold">Теги</h2>
      <TagInput v-model="form.tags" />
    </div>

    <!-- Coordinates -->
    <div class="space-y-5 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
      <h2 class="text-lg font-semibold">Координаты</h2>
      <YandexMapPicker v-model="form.coordinates" />
    </div>

    <!-- Gallery -->
    <div class="space-y-5 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
      <h2 class="text-lg font-semibold">Галерея</h2>
      <GalleryUpload v-model="form.gallery" :project-id="project.id" />
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3">
      <UButton
        :disabled="!canSave"
        :loading="saveMutation.isPending.value"
        icon="i-tabler-device-floppy"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl transition-colors"
        @click="saveMutation.mutate()"
      >
        Сохранить
      </UButton>
      <UButton
        variant="outline"
        class="rounded-xl"
        @click="router.push(`/projects/${project.id}`)"
      >
        Отмена
      </UButton>
    </div>
  </div>
</template>
