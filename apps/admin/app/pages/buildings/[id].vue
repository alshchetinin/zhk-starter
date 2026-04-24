<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const route = useRoute();
const toast = useToast();
const queryClient = useQueryClient();
const id = computed(() => route.params.id as string);

const { data: building, isPending } = useQuery(
  computed(() => $orpc.buildings.getById.queryOptions({ input: { id: id.value } })),
);

// Fetch all apartments for this building (dedicated endpoint, no pagination)
const { data: allApartments } = useQuery(
  computed(() =>
    $orpc.apartments.listByBuilding.queryOptions({
      input: { buildingId: id.value },
    }),
  ),
);

// Group apartments by sectionId → floorNumber (descending) → sorted by apartmentNumber
const checkerboardData = computed(() => {
  if (!building.value?.sections || !allApartments.value) return [];

  const aptsBySection = new Map<string, typeof allApartments.value>();
  for (const apt of allApartments.value) {
    const sectionId = apt.sectionId ?? "__none__";
    if (!aptsBySection.has(sectionId)) aptsBySection.set(sectionId, []);
    aptsBySection.get(sectionId)!.push(apt);
  }

  return building.value.sections.map((section) => {
    const sectionApts = aptsBySection.get(section.id) ?? [];

    const floorMap = new Map<number, typeof sectionApts>();
    for (const apt of sectionApts) {
      const floor = apt.floorNumber ?? 0;
      if (!floorMap.has(floor)) floorMap.set(floor, []);
      floorMap.get(floor)!.push(apt);
    }

    const floors = [...floorMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([floorNumber, apts]) => ({
        floorNumber,
        apartments: apts.sort((a, b) =>
          parseInt(a.apartmentNumber) - parseInt(b.apartmentNumber),
        ),
      }));

    return { section, floors, totalApts: sectionApts.length };
  });
});

const hasApartments = computed(() =>
  checkerboardData.value.some((s) => s.totalApts > 0),
);

// Section CRUD
type Section = {
  id: string;
  name: string;
  floorsCount: number | null;
  masterplanImage: string | null;
};

const sectionFormOpen = ref(false);
const editingSection = ref<Section | null>(null);
const sectionToDelete = ref<Section | null>(null);

const sectionForm = reactive({
  name: "",
  floorsCount: null as number | null,
  masterplanImage: null as string | null,
});

function resetSectionForm() {
  sectionForm.name = "";
  sectionForm.floorsCount = null;
  sectionForm.masterplanImage = null;
}

function openCreateSection() {
  editingSection.value = null;
  resetSectionForm();
  sectionFormOpen.value = true;
}

function openEditSection(s: Section) {
  editingSection.value = s;
  sectionForm.name = s.name;
  sectionForm.floorsCount = s.floorsCount;
  sectionForm.masterplanImage = s.masterplanImage ?? null;
  sectionFormOpen.value = true;
}

const buildingKey = computed(() =>
  $orpc.buildings.getById.queryKey({ input: { id: id.value } }),
);

const createSectionMut = useMutation({
  mutationFn: () =>
    $orpcClient.sections.create({
      buildingId: id.value,
      name: sectionForm.name.trim(),
      floorsCount: sectionForm.floorsCount ?? null,
      masterplanImage: sectionForm.masterplanImage,
    }),
  onSuccess: () => {
    toast.add({ title: "Секция создана", color: "success" });
    sectionFormOpen.value = false;
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: buildingKey.value });
    queryClient.invalidateQueries({ queryKey: $orpc.sections.key() });
  },
});

const updateSectionMut = useMutation({
  mutationFn: () => {
    if (!editingSection.value) throw new Error("no section");
    return $orpcClient.sections.update({
      id: editingSection.value.id,
      name: sectionForm.name.trim(),
      floorsCount: sectionForm.floorsCount ?? null,
      masterplanImage: sectionForm.masterplanImage,
    });
  },
  onMutate: async () => {
    await queryClient.cancelQueries({ queryKey: buildingKey.value });
    const prev = queryClient.getQueryData(buildingKey.value);
    queryClient.setQueryData(buildingKey.value, (old: any) => {
      if (!old?.sections || !editingSection.value) return old;
      return {
        ...old,
        sections: old.sections.map((s: any) =>
          s.id === editingSection.value!.id
            ? {
                ...s,
                name: sectionForm.name.trim(),
                floorsCount: sectionForm.floorsCount ?? null,
                masterplanImage: sectionForm.masterplanImage,
              }
            : s,
        ),
      };
    });
    return { prev };
  },
  onError: (_e, _v, ctx) => {
    if (ctx) queryClient.setQueryData(buildingKey.value, ctx.prev);
  },
  onSuccess: () => {
    toast.add({ title: "Секция обновлена", color: "success" });
    sectionFormOpen.value = false;
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: buildingKey.value });
    queryClient.invalidateQueries({ queryKey: $orpc.sections.key() });
  },
});

const deleteSectionMut = useMutation({
  mutationFn: (sid: string) => $orpcClient.sections.delete({ id: sid }),
  onMutate: async (sid) => {
    await queryClient.cancelQueries({ queryKey: buildingKey.value });
    const prev = queryClient.getQueryData(buildingKey.value);
    queryClient.setQueryData(buildingKey.value, (old: any) => {
      if (!old?.sections) return old;
      return { ...old, sections: old.sections.filter((s: any) => s.id !== sid) };
    });
    return { prev };
  },
  onError: (_e, _v, ctx) => {
    if (ctx) queryClient.setQueryData(buildingKey.value, ctx.prev);
  },
  onSuccess: () => {
    toast.add({ title: "Секция удалена", color: "success" });
    sectionToDelete.value = null;
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: buildingKey.value });
    queryClient.invalidateQueries({ queryKey: $orpc.sections.key() });
  },
});

function submitSection() {
  if (!sectionForm.name.trim()) return;
  if (editingSection.value) updateSectionMut.mutate();
  else createSectionMut.mutate();
}

const isSectionSubmitting = computed(
  () => createSectionMut.isPending.value || updateSectionMut.isPending.value,
);
</script>

<template>
  <PageContainer>
    <UBreadcrumb
      :items="[
        { label: 'Дома', to: '/buildings', icon: 'i-tabler-building-skyscraper' },
        { label: building?.name ?? '...' },
      ]"
      class="mb-6"
    />

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <template v-else-if="building">
      <div class="mb-6 flex items-center gap-3">
        <h1 class="text-2xl font-bold">{{ building.name }}</h1>
        <UBadge v-if="building.integrationId" color="warning" variant="subtle">
          Импорт
        </UBadge>
      </div>

      <UAlert
        v-if="building.integrationId"
        color="warning"
        variant="subtle"
        icon="i-tabler-info-circle"
        title="Этот дом управляется интеграцией"
        description="Изменения и удаление будут перезаписаны при следующей синхронизации."
        class="mb-4"
      />

      <div class="mb-8 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="flex items-start gap-3">
            <UIcon name="i-tabler-building" class="mt-0.5 size-4 text-(--ui-text-muted)" />
            <div>
              <p class="text-xs text-(--ui-text-muted)">ЖК</p>
              <NuxtLink
                v-if="building.project"
                :to="`/projects/${building.project.id}`"
                class="text-sm font-medium text-primary hover:underline"
              >
                {{ building.project.name }}
              </NuxtLink>
              <p v-else class="text-sm font-medium">—</p>
            </div>
          </div>
          <div v-if="building.completionDate" class="flex items-start gap-3">
            <UIcon name="i-tabler-calendar" class="mt-0.5 size-4 text-(--ui-text-muted)" />
            <div>
              <p class="text-xs text-(--ui-text-muted)">Дата сдачи</p>
              <p class="text-sm font-medium">{{ building.completionDate }}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <UIcon name="i-tabler-layers-intersect" class="mt-0.5 size-4 text-(--ui-text-muted)" />
            <div>
              <p class="text-xs text-(--ui-text-muted)">Секций</p>
              <p class="text-sm font-medium">{{ building.sections?.length ?? 0 }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Sections CRUD -->
      <div class="mb-8">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Секции ({{ building.sections?.length ?? 0 }})
          </h2>
          <UButton
            icon="i-tabler-plus"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
            @click="openCreateSection"
          >
            Добавить секцию
          </UButton>
        </div>
        <div
          v-if="building.sections?.length"
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div
            v-for="section in building.sections"
            :key="section.id"
            class="flex items-center justify-between gap-2 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4"
          >
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="i-tabler-layers-intersect" class="size-4 shrink-0 text-(--ui-text-muted)" />
              <div class="min-w-0">
                <div class="font-medium truncate">{{ section.name }}</div>
                <div v-if="section.floorsCount" class="text-xs text-(--ui-text-muted)">
                  {{ section.floorsCount }} эт.
                </div>
              </div>
            </div>
            <div class="flex shrink-0 gap-1">
              <UButton
                variant="ghost"
                size="xs"
                icon="i-tabler-edit"
                class="rounded-lg"
                @click="openEditSection(section as Section)"
              />
              <UButton
                variant="ghost"
                size="xs"
                icon="i-tabler-trash"
                color="error"
                class="rounded-lg"
                @click="sectionToDelete = section as Section"
              />
            </div>
          </div>
        </div>
        <div v-else class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-8 text-center">
          <p class="text-(--ui-text-muted)">Секций пока нет</p>
        </div>
      </div>

      <!-- Apartment Stats -->
      <div class="mb-8">
        <h2 class="mb-4 text-lg font-semibold">Квартиры</h2>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-home" class="size-4 text-blue-500" />
              <span class="text-xs text-(--ui-text-muted)">Всего</span>
            </div>
            <p class="mt-1 text-xl font-bold">{{ building.totalApartmentsCount ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-circle-check" class="size-4 text-green-500" />
              <span class="text-xs text-(--ui-text-muted)">Свободно</span>
            </div>
            <p class="mt-1 text-xl font-bold text-green-600">{{ building.freeApartmentsCount ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-circle-x" class="size-4 text-red-500" />
              <span class="text-xs text-(--ui-text-muted)">Продано</span>
            </div>
            <p class="mt-1 text-xl font-bold">{{ building.soldApartmentsCount ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-clock" class="size-4 text-yellow-500" />
              <span class="text-xs text-(--ui-text-muted)">Бронь</span>
            </div>
            <p class="mt-1 text-xl font-bold">{{ building.paidReservationCount ?? 0 }}</p>
          </div>
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-briefcase" class="size-4 text-purple-500" />
              <span class="text-xs text-(--ui-text-muted)">Корп.</span>
            </div>
            <p class="mt-1 text-xl font-bold">{{ building.corporateReservationCount ?? 0 }}</p>
          </div>
        </div>
      </div>

      <div v-if="hasApartments" class="mb-8">
        <h2 class="mb-4 text-lg font-semibold">Шахматка</h2>
        <div class="mb-4 flex flex-wrap gap-3">
          <div class="flex items-center gap-1.5 text-xs">
            <span class="size-3 rounded bg-green-100 border border-green-200 dark:bg-green-950 dark:border-green-800" />
            <span class="text-(--ui-text-muted)">Свободно</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="size-3 rounded bg-blue-100 border border-blue-200 dark:bg-blue-950 dark:border-blue-800" />
            <span class="text-(--ui-text-muted)">Бронь</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="size-3 rounded bg-yellow-100 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800" />
            <span class="text-(--ui-text-muted)">Корпоративная</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="size-3 rounded bg-red-100 border border-red-200 dark:bg-red-950 dark:border-red-800" />
            <span class="text-(--ui-text-muted)">Продано</span>
          </div>
        </div>

        <div class="flex items-end gap-4 overflow-x-auto pb-2">
          <div
            v-for="{ section, floors } in checkerboardData"
            :key="section.id"
            class="shrink-0 rounded-xl border border-(--ui-border) bg-(--ui-bg) shadow-sm"
          >
            <div class="border-b border-(--ui-border) px-4 py-3">
              <h3 class="text-sm font-semibold">{{ section.name }}</h3>
            </div>
            <div class="space-y-1 p-2">
              <div
                v-for="floor in floors"
                :key="floor.floorNumber"
                class="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-(--ui-bg-elevated)"
              >
                <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-(--ui-bg-elevated) text-xs font-medium text-(--ui-text-muted)">
                  {{ floor.floorNumber }}
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <CheckerboardCell
                    v-for="apt in floor.apartments"
                    :key="apt.id"
                    :apartment="apt"
                  />
                </div>
              </div>
              <div v-if="!floors.length" class="px-4 py-6 text-center text-sm text-(--ui-text-muted)">
                Квартир нет
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section form modal -->
      <UModal
        v-model:open="sectionFormOpen"
        :title="editingSection ? 'Редактировать секцию' : 'Новая секция'"
      >
        <template #body>
          <div class="space-y-4">
            <UFormField label="Название" required>
              <UInput v-model="sectionForm.name" placeholder="Секция 1" />
            </UFormField>
            <UFormField label="Этажей">
              <UInput v-model.number="sectionForm.floorsCount" type="number" min="1" />
            </UFormField>
            <UFormField label="Мастер-план">
              <ImageUpload v-model="sectionForm.masterplanImage" folder="sections" />
            </UFormField>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" class="rounded-xl" @click="sectionFormOpen = false">
              Отмена
            </UButton>
            <UButton
              :loading="isSectionSubmitting"
              :disabled="!sectionForm.name.trim()"
              class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
              @click="submitSection"
            >
              {{ editingSection ? "Сохранить" : "Создать" }}
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Section delete confirm -->
      <UModal
        :open="sectionToDelete != null"
        title="Удалить секцию?"
        @update:open="(v) => { if (!v) sectionToDelete = null }"
      >
        <template #body>
          <p class="text-sm text-(--ui-text-muted)">
            Секция <b>{{ sectionToDelete?.name }}</b> будет удалена вместе с этажами,
            планировками этажей и квартирами в ней. Действие необратимо.
          </p>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" class="rounded-xl" @click="sectionToDelete = null">
              Отмена
            </UButton>
            <UButton
              color="error"
              :loading="deleteSectionMut.isPending.value"
              class="rounded-xl"
              @click="sectionToDelete && deleteSectionMut.mutate(sectionToDelete.id)"
            >
              Удалить
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </PageContainer>
</template>
