<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const route = useRoute();
const toast = useToast();
const queryClient = useQueryClient();
const id = computed(() => route.params.id as string);

const { data: building, isPending } = useQuery(
  computed(() =>
    $orpc.buildings.getById.queryOptions({ input: { id: id.value } }),
  ),
);

const { data: allApartments } = useQuery(
  computed(() =>
    $orpc.apartments.listByBuilding.queryOptions({
      input: { buildingId: id.value },
    }),
  ),
);

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
        apartments: apts.sort(
          (a, b) => parseInt(a.apartmentNumber) - parseInt(b.apartmentNumber),
        ),
      }));

    return { section, floors, totalApts: sectionApts.length };
  });
});

const hasApartments = computed(() =>
  checkerboardData.value.some((s) => s.totalApts > 0),
);

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
      return {
        ...old,
        sections: old.sections.filter((s: any) => s.id !== sid),
      };
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
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <template v-else-if="building">
      <AppPageHeader
        :title="building.name"
        back="/buildings"
        :crumbs="[
          { label: 'Дома', to: '/buildings' },
          { label: building.name },
        ]"
      >
        <template #actions>
          <AppStatusPill
            v-if="building.integrationId"
            tone="warning"
            label="Импорт"
            dot
          />
          <AppToolbarButton
            :to="`/sections/create?buildingId=${id}`"
            icon="i-tabler-stack-2"
            variant="ghost"
          >
            Заполнить секцию
          </AppToolbarButton>
          <AppToolbarButton
            icon="i-tabler-plus"
            variant="primary"
            @click="openCreateSection"
          >
            Пустая секция
          </AppToolbarButton>
        </template>
      </AppPageHeader>

      <UAlert
        v-if="building.integrationId"
        color="warning"
        variant="subtle"
        icon="i-tabler-info-circle"
        title="Этот дом управляется интеграцией"
        description="Изменения и удаление будут перезаписаны при следующей синхронизации."
        class="mb-4"
      />

      <!-- Hero stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
        <AppStatHero label="Всего" accent="zinc">
          <template #value>{{ building.totalApartmentsCount ?? 0 }}</template>
        </AppStatHero>
        <AppStatHero label="Свободно" accent="emerald">
          <template #value>{{ building.freeApartmentsCount ?? 0 }}</template>
        </AppStatHero>
        <AppStatHero label="Бронь оплачена" accent="amber">
          <template #value>{{ building.paidReservationCount ?? 0 }}</template>
        </AppStatHero>
        <AppStatHero label="Бронь корп." accent="violet">
          <template #value>{{
            building.corporateReservationCount ?? 0
          }}</template>
        </AppStatHero>
        <AppStatHero label="Продано" accent="zinc">
          <template #value>{{ building.soldApartmentsCount ?? 0 }}</template>
        </AppStatHero>
      </div>

      <!-- Building meta -->
      <AppDataCard title="Информация" class="mb-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
              ЖК
            </p>
            <NuxtLink
              v-if="building.project"
              :to="`/projects/${building.project.id}`"
              class="text-sm font-medium hover:underline mt-0.5 block"
            >
              {{ building.project.name }}
            </NuxtLink>
            <p v-else class="text-sm font-medium mt-0.5">—</p>
          </div>
          <div v-if="building.completionDate">
            <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
              Дата сдачи
            </p>
            <p class="text-sm font-medium mt-0.5 tabular-nums">
              {{ building.completionDate }}
            </p>
          </div>
          <div>
            <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
              Секций
            </p>
            <p class="text-sm font-medium mt-0.5 tabular-nums">
              {{ building.sections?.length ?? 0 }}
            </p>
          </div>
        </div>
      </AppDataCard>

      <!-- Sections list -->
      <AppDataCard
        flush
        :title="`Секции · ${building.sections?.length ?? 0}`"
        class="mb-4"
      >
        <div
          v-if="building.sections?.length"
          class="divide-y divide-(--ui-border)"
        >
          <div
            v-for="section in building.sections"
            :key="section.id"
            class="group flex items-center gap-3 px-4 py-2.5 hover:bg-(--ui-bg-elevated) transition"
          >
            <UIcon
              name="i-tabler-layers-intersect"
              class="size-4 text-(--ui-text-dimmed) shrink-0"
            />
            <div class="flex-1 min-w-0">
              <span class="text-sm font-medium truncate">{{ section.name }}</span>
              <span
                v-if="section.floorsCount"
                class="text-[11px] text-(--ui-text-dimmed) tabular-nums ml-2"
              >
                · {{ section.floorsCount }} эт.
              </span>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              <AppToolbarButton
                icon="i-tabler-edit"
                variant="subtle"
                title="Редактировать"
                @click="openEditSection(section as Section)"
              />
              <AppToolbarButton
                icon="i-tabler-trash"
                variant="subtle"
                title="Удалить"
                @click="sectionToDelete = section as Section"
              />
            </div>
          </div>
        </div>
        <AppEmptyState
          v-else
          compact
          icon="i-tabler-layers-off"
          title="Секций пока нет"
          description="Создайте секцию или запустите мастер заполнения."
        />
      </AppDataCard>

      <!-- Checkerboard -->
      <AppDataCard v-if="hasApartments" flush title="Шахматка">
        <template #actions>
          <div class="flex items-center gap-3 text-[11px]">
            <span class="flex items-center gap-1.5">
              <span
                class="size-2 rounded-sm bg-emerald-500/30 border border-emerald-500/50"
              />
              <span class="text-(--ui-text-dimmed)">Свободно</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span
                class="size-2 rounded-sm bg-amber-500/30 border border-amber-500/50"
              />
              <span class="text-(--ui-text-dimmed)">Бронь</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span
                class="size-2 rounded-sm bg-violet-500/30 border border-violet-500/50"
              />
              <span class="text-(--ui-text-dimmed)">Корп.</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span
                class="size-2 rounded-sm bg-zinc-500/30 border border-zinc-500/50"
              />
              <span class="text-(--ui-text-dimmed)">Продано</span>
            </span>
          </div>
        </template>
        <div class="flex items-end gap-3 overflow-x-auto p-4">
          <div
            v-for="{ section, floors } in checkerboardData"
            :key="section.id"
            class="shrink-0 rounded-lg border border-(--ui-border) bg-(--ui-bg)"
          >
            <div class="border-b border-(--ui-border) px-3 py-2">
              <h3 class="text-xs font-semibold tracking-tight">
                {{ section.name }}
              </h3>
            </div>
            <div class="space-y-1 p-2">
              <div
                v-for="floor in floors"
                :key="floor.floorNumber"
                class="flex items-center gap-2 rounded-md p-1 hover:bg-(--ui-bg-elevated) transition"
              >
                <div
                  class="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--ui-bg-elevated) text-[11px] font-medium text-(--ui-text-muted) tabular-nums"
                >
                  {{ floor.floorNumber }}
                </div>
                <div class="flex flex-wrap gap-1">
                  <CheckerboardCell
                    v-for="apt in floor.apartments"
                    :key="apt.id"
                    :apartment="apt"
                  />
                </div>
              </div>
              <div
                v-if="!floors.length"
                class="px-3 py-4 text-center text-xs text-(--ui-text-dimmed)"
              >
                Квартир нет
              </div>
            </div>
          </div>
        </div>
      </AppDataCard>

      <!-- Section form modal -->
      <UModal
        v-model:open="sectionFormOpen"
        :title="editingSection ? 'Редактировать секцию' : 'Новая секция'"
      >
        <template #body>
          <div class="space-y-4">
            <UFormField label="Название" required>
              <UInput v-model="sectionForm.name" placeholder="Секция 1" size="sm" />
            </UFormField>
            <UFormField label="Этажей">
              <UInput
                v-model.number="sectionForm.floorsCount"
                type="number"
                min="1"
                size="sm"
              />
            </UFormField>
            <UFormField label="Мастер-план">
              <ImageUpload
                v-model="sectionForm.masterplanImage"
                folder="sections"
              />
            </UFormField>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <AppToolbarButton
              variant="ghost"
              @click="sectionFormOpen = false"
            >
              Отмена
            </AppToolbarButton>
            <AppToolbarButton
              variant="primary"
              :loading="isSectionSubmitting"
              :disabled="!sectionForm.name.trim()"
              @click="submitSection"
            >
              {{ editingSection ? "Сохранить" : "Создать" }}
            </AppToolbarButton>
          </div>
        </template>
      </UModal>

      <UModal
        :open="sectionToDelete != null"
        title="Удалить секцию?"
        @update:open="(v) => { if (!v) sectionToDelete = null }"
      >
        <template #body>
          <p class="text-sm text-(--ui-text-muted)">
            Секция <b>{{ sectionToDelete?.name }}</b> будет удалена вместе с
            этажами, планировками этажей и квартирами в ней. Действие
            необратимо.
          </p>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <AppToolbarButton variant="ghost" @click="sectionToDelete = null">
              Отмена
            </AppToolbarButton>
            <button
              class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition disabled:opacity-40"
              :disabled="deleteSectionMut.isPending.value"
              @click="
                sectionToDelete && deleteSectionMut.mutate(sectionToDelete.id)
              "
            >
              <UIcon
                v-if="deleteSectionMut.isPending.value"
                name="i-tabler-loader-2"
                class="size-3.5 animate-spin"
              />
              <UIcon v-else name="i-tabler-trash" class="size-3.5" />
              Удалить
            </button>
          </div>
        </template>
      </UModal>
    </template>
  </PageContainer>
</template>
