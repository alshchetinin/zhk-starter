<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const props = defineProps<{
  kind: "commerce" | "parking" | "storage";
  title: string;
  withCategory?: boolean;
}>();

const { $orpc, $orpcClient } = useNuxtApp() as any;
const toast = useToast();
const queryClient = useQueryClient();

const router = $orpc[props.kind];
const client = $orpcClient[props.kind];

const page = ref(1);
const pageSize = 20;

const projectFilter = ref("");
const filterOpen = ref(false);

const { data: projectsData } = useQuery(
  $orpc.projects.list.queryOptions({ input: { page: 1, pageSize: 100 } }),
);
const projectItems = computed(() =>
  projectsData.value?.data.map((p: any) => ({ label: p.name, value: p.id })) ?? [],
);

const activeFiltersCount = computed(() => (projectFilter.value ? 1 : 0));

watch(projectFilter, () => {
  page.value = 1;
});

function clearFilters() {
  projectFilter.value = "";
}

const listKey = computed(() => router.list.key());

const { data, isPending } = useQuery(
  computed(() =>
    router.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        projectId: projectFilter.value || undefined,
      },
    }),
  ),
);

function formatPrice(price: string | number | null) {
  if (!price) return "—";
  return Number(price).toLocaleString("ru-RU");
}

type Item = {
  id: string;
  name: string | null;
  category?: string | null;
  area: string | null;
  price: string | null;
  floorNumber: number | null;
  isPublished: boolean | null;
  projectId: string | null;
  buildingId: string | null;
  layoutImage?: string | null;
};

const formOpen = ref(false);
const editing = ref<Item | null>(null);
const toDelete = ref<Item | null>(null);

const form = reactive({
  name: "",
  category: "",
  area: null as number | null,
  price: null as number | null,
  floorNumber: null as number | null,
  isPublished: true,
  projectId: "",
  buildingId: "",
  layoutImage: "",
});

// Buildings by project (for form select)
const buildingsQuery = useQuery(
  computed(() => ({
    ...$orpc.buildings.list.queryOptions({
      input: {
        page: 1,
        pageSize: 100,
        projectId: form.projectId || undefined,
      },
    }),
    enabled: !!form.projectId,
  })),
);

const buildingItems = computed(() =>
  (buildingsQuery.data.value?.data ?? []).map((b: any) => ({
    label: b.name,
    value: b.id,
  })),
);

function resetForm() {
  form.name = "";
  form.category = "";
  form.area = null;
  form.price = null;
  form.floorNumber = null;
  form.isPublished = true;
  form.projectId = projectFilter.value || "";
  form.buildingId = "";
  form.layoutImage = "";
}

function openCreate() {
  editing.value = null;
  resetForm();
  formOpen.value = true;
}

function openEdit(it: Item) {
  editing.value = it;
  form.name = it.name ?? "";
  form.category = it.category ?? "";
  form.area = it.area != null ? Number(it.area) : null;
  form.price = it.price != null ? Number(it.price) : null;
  form.floorNumber = it.floorNumber ?? null;
  form.isPublished = it.isPublished ?? true;
  form.projectId = it.projectId ?? "";
  form.buildingId = it.buildingId ?? "";
  form.layoutImage = it.layoutImage ?? "";
  formOpen.value = true;
}

watch(
  () => form.projectId,
  (nv, ov) => {
    if (nv !== ov) form.buildingId = "";
  },
);

function buildPayload() {
  const base: any = {
    name: form.name.trim(),
    area: form.area ?? null,
    price: form.price ?? null,
    floorNumber: form.floorNumber ?? null,
    isPublished: form.isPublished,
    buildingId: form.buildingId || null,
  };
  if (props.withCategory) base.category = form.category.trim() || null;
  if (props.kind === "commerce")
    base.layoutImage = form.layoutImage.trim() || null;
  return base;
}

const createMut = useMutation({
  mutationFn: () =>
    client.create({
      ...buildPayload(),
      projectId: form.projectId,
    }),
  onSuccess: () => {
    toast.add({ title: "Создано", color: "success" });
    formOpen.value = false;
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: listKey.value }),
});

const updateMut = useMutation({
  mutationFn: () =>
    client.update({
      id: editing.value!.id,
      ...buildPayload(),
    }),
  onSuccess: () => {
    toast.add({ title: "Обновлено", color: "success" });
    formOpen.value = false;
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: listKey.value }),
});

const deleteMut = useMutation({
  mutationFn: (id: string) => client.delete({ id }),
  onMutate: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: listKey.value });
    const snapshots = queryClient.getQueriesData({ queryKey: listKey.value });
    queryClient.setQueriesData({ queryKey: listKey.value }, (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.filter((i: any) => i.id !== id),
        total: Math.max(0, (old.total ?? 0) - 1),
      };
    });
    return { snapshots };
  },
  onError: (_e, _v, ctx: any) => {
    if (ctx) for (const [k, d] of ctx.snapshots) queryClient.setQueryData(k, d);
  },
  onSuccess: () => {
    toast.add({ title: "Удалено", color: "success" });
    toDelete.value = null;
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: listKey.value }),
});

function submit() {
  if (!form.name.trim() || !form.projectId) return;
  if (editing.value) updateMut.mutate();
  else createMut.mutate();
}

const isSubmitting = computed(
  () => createMut.isPending.value || updateMut.isPending.value,
);

const columns = computed(() => {
  const cols: any[] = [{ accessorKey: "name", header: "Название" }];
  if (props.withCategory) cols.push({ id: "category", header: "Категория" });
  cols.push(
    { accessorKey: "area", header: "м²" },
    { id: "price", header: "Цена" },
    { accessorKey: "floorNumber", header: "Этаж" },
    { id: "project", header: "ЖК" },
    { id: "actions", header: "" },
  );
  return cols;
});
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between gap-2">
      <h1 class="text-2xl font-bold">{{ title }}</h1>
      <div class="flex gap-2">
        <UButton
          icon="i-tabler-plus"
          class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
          @click="openCreate"
        >
          Добавить
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
    </div>

    <USlideover v-model:open="filterOpen" title="Фильтры" side="right">
      <template #body>
        <div class="flex flex-col gap-5 p-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium">ЖК</label>
            <USelect v-model="projectFilter" :items="projectItems" placeholder="Все" />
          </div>
          <div class="flex gap-2 mt-2">
            <UButton block @click="filterOpen = false">Применить</UButton>
            <UButton block variant="outline" color="neutral" @click="clearFilters">Сброс</UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <UTable :data="data?.data ?? []" :columns="columns" :loading="isPending">
      <template #name-cell="{ row }">
        <NuxtLink
          :to="`/${kind}/${row.original.id}`"
          class="font-medium hover:underline"
        >
          {{ row.original.name ?? '—' }}
        </NuxtLink>
      </template>

      <template #category-cell="{ row }">
        <UBadge v-if="row.original.category" variant="subtle" color="neutral">
          {{ row.original.category }}
        </UBadge>
        <span v-else class="text-(--ui-text-muted)">—</span>
      </template>

      <template #price-cell="{ row }">
        {{ formatPrice(row.original.price) }}{{ row.original.price ? ' ₽' : '' }}
      </template>

      <template #project-cell="{ row }">
        <NuxtLink
          v-if="row.original.project"
          :to="`/projects/${row.original.project.id}`"
          class="text-primary hover:underline"
        >
          {{ row.original.project.name }}
        </NuxtLink>
        <span v-else class="text-(--ui-text-muted)">—</span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton variant="ghost" size="sm" icon="i-tabler-edit" @click="openEdit(row.original as Item)" />
          <UButton variant="ghost" size="sm" icon="i-tabler-trash" color="error" @click="toDelete = row.original as Item" />
        </div>
      </template>
    </UTable>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-6 flex justify-center">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>

    <UModal
      v-model:open="formOpen"
      :title="editing ? 'Редактировать' : 'Новая запись'"
    >
      <template #body>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Название" required class="sm:col-span-2">
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField v-if="withCategory" label="Категория" class="sm:col-span-2">
            <UInput v-model="form.category" placeholder="cafe, shop..." />
          </UFormField>
          <UFormField label="Площадь, м²">
            <UInput v-model.number="form.area" type="number" step="0.01" />
          </UFormField>
          <UFormField label="Цена, ₽">
            <UInput v-model.number="form.price" type="number" min="0" />
          </UFormField>
          <UFormField label="Этаж">
            <UInput v-model.number="form.floorNumber" type="number" />
          </UFormField>
          <UFormField label="Опубликовано">
            <USwitch v-model="form.isPublished" />
          </UFormField>
          <UFormField label="ЖК" required>
            <USelect v-model="form.projectId" :items="projectItems" placeholder="—" :disabled="!!editing" />
          </UFormField>
          <UFormField label="Дом">
            <USelect v-model="form.buildingId" :items="buildingItems" placeholder="—" :disabled="!form.projectId" />
          </UFormField>
          <UFormField v-if="kind === 'commerce'" label="Картинка (URL)" class="sm:col-span-2">
            <UInput v-model="form.layoutImage" placeholder="https://..." />
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
            :disabled="!form.name.trim() || !form.projectId"
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
      title="Удалить?"
      @update:open="(v: boolean) => { if (!v) toDelete = null }"
    >
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">
          Запись <b>{{ toDelete?.name ?? '—' }}</b> будет удалена. Действие необратимо.
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
  </PageContainer>
</template>
