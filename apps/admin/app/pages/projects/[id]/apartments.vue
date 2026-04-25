<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const props = defineProps<{
  project: any;
}>();

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();
const route = useRoute();
const projectId = computed(() => route.params.id as string);

const page = ref(1);
const pageSize = 20;

// Filters
const statusFilter = ref("");
const roomsFilter = ref("");
const buildingFilter = ref("");
const filterOpen = ref(false);

const buildingItems = computed(() =>
  props.project?.buildings?.map((b: any) => ({ label: b.name, value: b.id })) ?? [],
);

const statusItems = [
  { label: "Свободна", value: "free" },
  { label: "Бронь", value: "paid_reservation" },
  { label: "Корпоративная", value: "corporate_reservation" },
  { label: "Продана", value: "sold" },
];

const roomsItems = [
  { label: "Студия", value: "0" },
  { label: "1 комн.", value: "1" },
  { label: "2 комн.", value: "2" },
  { label: "3 комн.", value: "3" },
  { label: "4+ комн.", value: "4" },
];

const activeFiltersCount = computed(() => {
  let count = 0;
  if (statusFilter.value) count++;
  if (roomsFilter.value) count++;
  if (buildingFilter.value) count++;
  return count;
});

watch([statusFilter, roomsFilter, buildingFilter], () => {
  page.value = 1;
});

function clearFilters() {
  statusFilter.value = "";
  roomsFilter.value = "";
  buildingFilter.value = "";
}

const apartmentsListKey = computed(() => $orpc.apartments.list.key());

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.apartments.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        projectId: projectId.value,
        buildingId: buildingFilter.value || undefined,
        status: (statusFilter.value || undefined) as any,
        roomsCount: roomsFilter.value ? Number(roomsFilter.value) : undefined,
      },
    }),
  ),
);

// Layouts for select
const { data: layoutsData } = useQuery(
  computed(() =>
    $orpc.apartmentLayouts.list.queryOptions({
      input: { page: 1, pageSize: 200, projectId: projectId.value },
    }),
  ),
);

const layoutItems = computed(() =>
  (layoutsData.value?.data ?? []).map((l: any) => ({
    label: `${l.name} (${l.area} м², ${l.roomsCount} комн.)`,
    value: l.id,
  })),
);

// Sections fetched on demand via building.sections
const sectionsForSelected = computed(() => {
  const b = props.project?.buildings?.find(
    (b: any) => b.id === form.buildingId,
  );
  return (b?.sections ?? []).map((s: any) => ({ label: s.name, value: s.id }));
});

const columns = [
  { accessorKey: "apartmentNumber", header: "№" },
  { accessorKey: "roomsCount", header: "Комн." },
  { accessorKey: "area", header: "м²" },
  { id: "price", header: "Цена" },
  { accessorKey: "floorNumber", header: "Этаж" },
  { id: "status", header: "Статус" },
  { id: "building", header: "Дом" },
  { id: "actions", header: "" },
];

const statusColors: Record<string, "success" | "warning" | "error" | "neutral"> = {
  free: "success",
  paid_reservation: "warning",
  corporate_reservation: "warning",
  sold: "error",
};

function formatPrice(price: string | number) {
  return Number(price).toLocaleString("ru-RU");
}

// CRUD state
type Apartment = {
  id: string;
  name: string;
  apartmentNumber: string;
  area: string;
  price: string;
  floorNumber: number;
  roomsCount: number;
  status: "free" | "paid_reservation" | "corporate_reservation" | "sold";
  isPublished: boolean | null;
  buildingId: string | null;
  sectionId: string | null;
  apartmentLayoutId: string | null;
  threeDTourUrl: string | null;
};

const formOpen = ref(false);
const editing = ref<Apartment | null>(null);
const toDelete = ref<Apartment | null>(null);

const form = reactive({
  name: "",
  apartmentNumber: "",
  area: 0,
  price: 0,
  floorNumber: 1,
  roomsCount: 1,
  status: "free" as Apartment["status"],
  isPublished: true,
  buildingId: "" as string,
  sectionId: "" as string,
  apartmentLayoutId: "" as string,
  threeDTourUrl: "",
});

function resetForm() {
  form.name = "";
  form.apartmentNumber = "";
  form.area = 0;
  form.price = 0;
  form.floorNumber = 1;
  form.roomsCount = 1;
  form.status = "free";
  form.isPublished = true;
  form.buildingId = "";
  form.sectionId = "";
  form.apartmentLayoutId = "";
  form.threeDTourUrl = "";
}

function openCreate() {
  editing.value = null;
  resetForm();
  formOpen.value = true;
}

function openEdit(a: Apartment) {
  editing.value = a;
  form.name = a.name;
  form.apartmentNumber = a.apartmentNumber;
  form.area = Number(a.area);
  form.price = Number(a.price);
  form.floorNumber = a.floorNumber;
  form.roomsCount = a.roomsCount;
  form.status = a.status;
  form.isPublished = a.isPublished ?? true;
  form.buildingId = a.buildingId ?? "";
  form.sectionId = a.sectionId ?? "";
  form.apartmentLayoutId = a.apartmentLayoutId ?? "";
  form.threeDTourUrl = a.threeDTourUrl ?? "";
  formOpen.value = true;
}

// Reset section when building changes
watch(
  () => form.buildingId,
  (nv, ov) => {
    if (nv !== ov) form.sectionId = "";
  },
);

const projectKey = computed(() =>
  $orpc.projects.getById.queryKey({ input: { id: projectId.value } }),
);

function invalidateAll() {
  queryClient.invalidateQueries({ queryKey: apartmentsListKey.value });
  queryClient.invalidateQueries({ queryKey: projectKey.value });
  queryClient.invalidateQueries({ queryKey: $orpc.apartments.key() });
  queryClient.invalidateQueries({ queryKey: $orpc.buildings.key() });
}

const createMut = useMutation({
  mutationFn: () =>
    $orpcClient.apartments.create({
      name: form.name.trim(),
      apartmentNumber: form.apartmentNumber.trim(),
      area: form.area,
      price: form.price,
      floorNumber: form.floorNumber,
      roomsCount: form.roomsCount,
      status: form.status,
      isPublished: form.isPublished,
      projectId: projectId.value,
      buildingId: form.buildingId || null,
      sectionId: form.sectionId || null,
      apartmentLayoutId: form.apartmentLayoutId || null,
      threeDTourUrl: form.threeDTourUrl.trim() || null,
    }),
  onSuccess: () => {
    toast.add({ title: "Квартира создана", color: "success" });
    formOpen.value = false;
  },
  onSettled: invalidateAll,
});

const updateMut = useMutation({
  mutationFn: () => {
    if (!editing.value) throw new Error("no apt");
    return $orpcClient.apartments.update({
      id: editing.value.id,
      name: form.name.trim(),
      apartmentNumber: form.apartmentNumber.trim(),
      area: form.area,
      price: form.price,
      floorNumber: form.floorNumber,
      roomsCount: form.roomsCount,
      status: form.status,
      isPublished: form.isPublished,
      buildingId: form.buildingId || null,
      sectionId: form.sectionId || null,
      apartmentLayoutId: form.apartmentLayoutId || null,
      threeDTourUrl: form.threeDTourUrl.trim() || null,
    });
  },
  onSuccess: () => {
    toast.add({ title: "Квартира обновлена", color: "success" });
    formOpen.value = false;
  },
  onSettled: invalidateAll,
});

const deleteMut = useMutation({
  mutationFn: (id: string) => $orpcClient.apartments.delete({ id }),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: apartmentsListKey.value });
    const snapshots = queryClient.getQueriesData({ queryKey: apartmentsListKey.value });
    queryClient.setQueriesData({ queryKey: apartmentsListKey.value }, (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.filter((a: any) => a.id !== id),
        total: Math.max(0, (old.total ?? 0) - 1),
      };
    });
    return { snapshots };
  },
  onError: (_e, _v, ctx) => {
    if (ctx) for (const [k, d] of ctx.snapshots) queryClient.setQueryData(k, d);
  },
  onSuccess: () => {
    toast.add({ title: "Квартира удалена", color: "success" });
    toDelete.value = null;
  },
  onSettled: invalidateAll,
});

function submit() {
  if (!form.name.trim() || !form.apartmentNumber.trim() || form.area <= 0)
    return;
  if (editing.value) updateMut.mutate();
  else createMut.mutate();
}

const isSubmitting = computed(
  () => createMut.isPending.value || updateMut.isPending.value,
);
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between gap-2">
      <UButton
        icon="i-tabler-plus"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
        @click="openCreate"
      >
        Добавить квартиру
      </UButton>
      <UButton
        icon="i-tabler-filter"
        variant="outline"
        color="neutral"
        @click="filterOpen = true"
      >
        Фильтры
        <UBadge v-if="activeFiltersCount" :label="String(activeFiltersCount)" size="sm" color="primary" class="ml-1" />
      </UButton>
    </div>

    <USlideover v-model:open="filterOpen" title="Фильтры" side="right">
      <template #body>
        <div class="flex flex-col gap-5 p-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium">Дом</label>
            <USelect v-model="buildingFilter" :items="buildingItems" placeholder="Все дома" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium">Статус</label>
            <USelect v-model="statusFilter" :items="statusItems" placeholder="Все статусы" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium">Комнат</label>
            <USelect v-model="roomsFilter" :items="roomsItems" placeholder="Все" />
          </div>
          <div class="flex gap-2 mt-2">
            <UButton block @click="filterOpen = false">Применить</UButton>
            <UButton block variant="outline" color="neutral" @click="clearFilters">Сброс</UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <UTable :data="data?.data ?? []" :columns="columns" :loading="isPending">
      <template #price-cell="{ row }">
        {{ formatPrice(row.original.price) }} ₽
      </template>
      <template #status-cell="{ row }">
        <UBadge :color="statusColors[row.original.status] ?? 'neutral'" variant="subtle">
          {{ row.original.status.replace(/_/g, " ") }}
        </UBadge>
      </template>
      <template #building-cell="{ row }">
        <NuxtLink
          v-if="row.original.building"
          :to="`/buildings/${row.original.building.id}`"
          class="text-primary hover:underline"
        >
          {{ row.original.building.name }}
        </NuxtLink>
        <span v-else class="text-(--ui-text-muted)">—</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton variant="ghost" size="sm" icon="i-tabler-edit" @click="openEdit(row.original as Apartment)" />
          <UButton variant="ghost" size="sm" icon="i-tabler-trash" color="error" @click="toDelete = row.original as Apartment" />
        </div>
      </template>
    </UTable>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-6 flex justify-center">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>

    <UModal
      v-model:open="formOpen"
      :title="editing ? 'Редактировать квартиру' : 'Новая квартира'"
    >
      <template #body>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Название" required>
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField label="Номер" required>
            <UInput v-model="form.apartmentNumber" />
          </UFormField>
          <UFormField label="Площадь, м²" required>
            <UInput v-model.number="form.area" type="number" step="0.01" min="0" />
          </UFormField>
          <UFormField label="Цена, ₽" required>
            <UInput v-model.number="form.price" type="number" min="0" />
          </UFormField>
          <UFormField label="Этаж" required>
            <UInput v-model.number="form.floorNumber" type="number" />
          </UFormField>
          <UFormField label="Комнат" required>
            <UInput v-model.number="form.roomsCount" type="number" min="0" />
          </UFormField>
          <UFormField label="Статус">
            <USelect v-model="form.status" :items="statusItems" />
          </UFormField>
          <UFormField label="Опубликована">
            <USwitch v-model="form.isPublished" />
          </UFormField>
          <UFormField label="Дом">
            <USelect v-model="form.buildingId" :items="buildingItems" placeholder="—" />
          </UFormField>
          <UFormField label="Секция">
            <USelect v-model="form.sectionId" :items="sectionsForSelected" placeholder="—" :disabled="!form.buildingId" />
          </UFormField>
          <UFormField label="Планировка" class="sm:col-span-2">
            <USelect v-model="form.apartmentLayoutId" :items="layoutItems" placeholder="—" />
          </UFormField>
          <UFormField label="3D-тур (URL)" class="sm:col-span-2">
            <UInput v-model="form.threeDTourUrl" placeholder="https://..." />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" class="rounded-xl" @click="formOpen = false">
            Отмена
          </UButton>
          <UButton
            :loading="isSubmitting"
            :disabled="!form.name.trim() || !form.apartmentNumber.trim() || form.area <= 0"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
            @click="submit"
          >
            {{ editing ? "Сохранить" : "Создать" }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      :open="toDelete != null"
      title="Удалить квартиру?"
      @update:open="(v) => { if (!v) toDelete = null }"
    >
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">
          Квартира <b>№{{ toDelete?.apartmentNumber }}</b> будет удалена.
          Действие необратимо.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" class="rounded-xl" @click="toDelete = null">
            Отмена
          </UButton>
          <UButton
            color="error"
            :loading="deleteMut.isPending.value"
            class="rounded-xl"
            @click="toDelete && deleteMut.mutate(toDelete.id)"
          >
            Удалить
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
