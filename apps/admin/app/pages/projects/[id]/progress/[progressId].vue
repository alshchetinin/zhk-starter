<script setup lang="ts">
import type { ContentBlock } from "@zhk/api/shared/blocks";
import { CalendarDate, DateFormatter, getLocalTimeZone } from "@internationalized/date";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const projectId = computed(() => route.params.id as string);
const progressId = computed(() => route.params.progressId as string);

const { data: entry, isPending } = useQuery(
  computed(() =>
    $orpc.constructionProgress.getById.queryOptions({
      input: { id: progressId.value },
    }),
  ),
);

// Load buildings for select
const { data: projectData } = useQuery(
  computed(() =>
    $orpc.projects.getById.queryOptions({ input: { id: projectId.value } }),
  ),
);

const BUILDING_NONE = "_none";

const buildingOptions = computed(() => {
  const buildings = projectData.value?.buildings ?? [];
  return [
    { label: "Весь проект", value: BUILDING_NONE },
    ...buildings.map((b: any) => ({ label: b.name, value: b.id })),
  ];
});

function parseDate(str: string): CalendarDate {
  const [y, m, d] = str.split("-").map(Number);
  return new CalendarDate(y!, m!, d ?? 1);
}

function dateToString(d: CalendarDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

const df = new DateFormatter("ru-RU", { dateStyle: "long" });
const now = new Date();
const dateValue = shallowRef(new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1));

const form = reactive({
  title: "",
  description: "",
  buildingId: BUILDING_NONE,
  gallery: [] as string[],
  contentBlocks: [] as ContentBlock[],
  status: "draft" as ConstructionProgressStatus,
});

whenever(entry, (val) => {
  form.title = val.title;
  form.description = val.description ?? "";
  dateValue.value = parseDate(val.date);
  form.buildingId = val.buildingId ?? BUILDING_NONE;
  form.gallery = (val.gallery as string[]) ?? [];
  form.contentBlocks = (val.contentBlocks as ContentBlock[]) ?? [];
  form.status = val.status as ConstructionProgressStatus;
}, { once: true, immediate: true });

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.constructionProgress.update({
      id: progressId.value,
      buildingId: form.buildingId === BUILDING_NONE ? null : form.buildingId,
      title: form.title,
      description: form.description || null,
      date: dateToString(dateValue.value),
      gallery: form.gallery,
      contentBlocks: form.contentBlocks,
      status: form.status,
    }),
  onSuccess: () => {
    toast.add({ title: "Запись обновлена", color: "success" });
    queryClient.invalidateQueries({
      queryKey: $orpc.constructionProgress.key(),
    });
  },
});

const deleteMutation = useMutation({
  mutationFn: () =>
    $orpcClient.constructionProgress.delete({ id: progressId.value }),
  onSuccess: () => {
    toast.add({ title: "Запись удалена", color: "success" });
    queryClient.invalidateQueries({
      queryKey: $orpc.constructionProgress.key(),
    });
    router.push(`/projects/${projectId.value}/progress`);
  },
});
</script>

<template>
  <div>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-(--ui-text-muted)"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <template v-else-if="entry">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink :to="`/projects/${projectId}/progress`">
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
            :disabled="!form.title.trim()"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </UButton>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <!-- Main content -->
        <div class="lg:col-span-2 space-y-3">
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4">
            <UFormField label="Заголовок" required>
              <UInput v-model="form.title" placeholder="Март 2024 — монтаж фасадов" size="lg" />
            </UFormField>

            <UFormField label="Описание">
              <UTextarea v-model="form.description" placeholder="Описание прогресса за период..." :rows="3" />
            </UFormField>
          </div>

          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
            <h3 class="text-lg font-semibold mb-4">Галерея</h3>
            <GalleryUpload v-model="form.gallery" :project-id="projectId" folder="construction-progress" />
          </div>

          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
            <h3 class="text-lg font-semibold mb-4">Контент</h3>
            <BlockDynamicZone v-model="form.contentBlocks" />
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-3">
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4">
            <UFormField label="Дата" required>
              <UPopover>
                <UButton color="neutral" variant="outline" icon="i-tabler-calendar" class="w-full justify-start">
                  {{ df.format(dateValue.toDate(getLocalTimeZone())) }}
                </UButton>
                <template #content>
                  <UCalendar v-model="dateValue" class="p-2" />
                </template>
              </UPopover>
            </UFormField>

            <UFormField label="Дом">
              <USelect v-model="form.buildingId" :items="buildingOptions" />
            </UFormField>

            <UFormField label="Статус">
              <USelect v-model="form.status" :items="constructionProgressStatusOptions" />
            </UFormField>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
