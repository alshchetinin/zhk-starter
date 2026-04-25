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

const listKey = computed(() => $orpc.apartmentLayouts.list.key());

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.apartmentLayouts.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        projectId: projectId.value,
      },
    }),
  ),
);

type Layout = {
  id: string;
  name: string;
  area: string;
  roomsCount: number;
  floorRange: string | null;
  priceRange: string | null;
  defaultLayoutImage: string | null;
  furnishedLayoutImage: string | null;
  threeDLayoutImage: string | null;
  ceilingHeight: string | null;
};

const formOpen = ref(false);
const editing = ref<Layout | null>(null);
const toDelete = ref<Layout | null>(null);

const form = reactive({
  name: "",
  area: 0,
  roomsCount: 1,
  floorRange: "",
  priceRange: "",
  defaultLayoutImage: null as string | null,
  furnishedLayoutImage: null as string | null,
  threeDLayoutImage: null as string | null,
  ceilingHeight: null as number | null,
});

function resetForm() {
  form.name = "";
  form.area = 0;
  form.roomsCount = 1;
  form.floorRange = "";
  form.priceRange = "";
  form.defaultLayoutImage = null;
  form.furnishedLayoutImage = null;
  form.threeDLayoutImage = null;
  form.ceilingHeight = null;
}

function openCreate() {
  editing.value = null;
  resetForm();
  formOpen.value = true;
}

function openEdit(l: Layout) {
  editing.value = l;
  form.name = l.name;
  form.area = Number(l.area);
  form.roomsCount = l.roomsCount;
  form.floorRange = l.floorRange ?? "";
  form.priceRange = l.priceRange ?? "";
  form.defaultLayoutImage = l.defaultLayoutImage ?? null;
  form.furnishedLayoutImage = l.furnishedLayoutImage ?? null;
  form.threeDLayoutImage = l.threeDLayoutImage ?? null;
  form.ceilingHeight = l.ceilingHeight ? Number(l.ceilingHeight) : null;
  formOpen.value = true;
}

const createMut = useMutation({
  mutationFn: () =>
    $orpcClient.apartmentLayouts.create({
      name: form.name.trim(),
      area: form.area,
      roomsCount: form.roomsCount,
      floorRange: form.floorRange.trim() || null,
      priceRange: form.priceRange.trim() || null,
      defaultLayoutImage: form.defaultLayoutImage,
      furnishedLayoutImage: form.furnishedLayoutImage,
      threeDLayoutImage: form.threeDLayoutImage,
      ceilingHeight: form.ceilingHeight ?? null,
    }),
  onSuccess: () => {
    toast.add({ title: "Планировка создана", color: "success" });
    formOpen.value = false;
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: listKey.value });
  },
});

const updateMut = useMutation({
  mutationFn: () => {
    if (!editing.value) throw new Error("no layout");
    return $orpcClient.apartmentLayouts.update({
      id: editing.value.id,
      name: form.name.trim(),
      area: form.area,
      roomsCount: form.roomsCount,
      floorRange: form.floorRange.trim() || null,
      priceRange: form.priceRange.trim() || null,
      defaultLayoutImage: form.defaultLayoutImage,
      furnishedLayoutImage: form.furnishedLayoutImage,
      threeDLayoutImage: form.threeDLayoutImage,
      ceilingHeight: form.ceilingHeight ?? null,
    });
  },
  onSuccess: () => {
    toast.add({ title: "Планировка обновлена", color: "success" });
    formOpen.value = false;
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: listKey.value });
  },
});

const deleteMut = useMutation({
  mutationFn: (id: string) => $orpcClient.apartmentLayouts.delete({ id }),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: listKey.value });
    const snapshots = queryClient.getQueriesData({ queryKey: listKey.value });
    queryClient.setQueriesData({ queryKey: listKey.value }, (old: any) => {
      if (!old?.data) return old;
      return {
        ...old,
        data: old.data.filter((l: any) => l.id !== id),
        total: Math.max(0, (old.total ?? 0) - 1),
      };
    });
    return { snapshots };
  },
  onError: (_e, _v, ctx) => {
    if (ctx) for (const [k, d] of ctx.snapshots) queryClient.setQueryData(k, d);
  },
  onSuccess: () => {
    toast.add({ title: "Планировка удалена", color: "success" });
    toDelete.value = null;
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: listKey.value });
  },
});

function submit() {
  if (!form.name.trim() || form.area <= 0) return;
  if (editing.value) updateMut.mutate();
  else createMut.mutate();
}

const isSubmitting = computed(
  () => createMut.isPending.value || updateMut.isPending.value,
);
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-sm font-semibold tracking-tight">
        Планировки
        <span
          v-if="data?.total"
          class="text-(--ui-text-dimmed) tabular-nums ml-1.5"
        >
          {{ data.total }}
        </span>
      </h2>
      <UButton
        icon="i-tabler-plus"
        color="primary"
        @click="openCreate"
      >
        Добавить планировку
      </UButton>
    </div>

    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <div
      v-else-if="data?.data.length"
      class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <div
        v-for="layout in data.data"
        :key="layout.id"
        class="group relative rounded-xl border border-(--ui-border) bg-(--ui-bg) overflow-hidden hover:border-(--ui-text-dimmed) transition"
      >
        <NuxtLink :to="`/layouts/${layout.id}`" class="block">
          <div
            v-if="layout.defaultLayoutImage"
            class="aspect-square bg-(--ui-bg-elevated)"
          >
            <img
              :src="layout.defaultLayoutImage"
              :alt="layout.name"
              class="size-full object-contain"
            />
          </div>
          <div
            v-else
            class="aspect-square bg-(--ui-bg-elevated) flex items-center justify-center"
          >
            <UIcon
              name="i-tabler-layout"
              class="size-10 text-(--ui-text-dimmed)"
            />
          </div>
          <div class="p-3 border-t border-(--ui-border)">
            <h3 class="font-semibold text-sm truncate">{{ layout.name }}</h3>
            <div class="mt-1 flex items-center gap-3 text-[11px] text-(--ui-text-dimmed) tabular-nums">
              <span>
                {{ layout.roomsCount === 0 ? "Студия" : `${layout.roomsCount}к` }}
              </span>
              <span>{{ layout.area }} м²</span>
            </div>
          </div>
        </NuxtLink>
        <div class="absolute top-2 right-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <UButton
            variant="outline"
            icon="i-tabler-edit"
            title="Редактировать"
            @click="openEdit(layout as Layout)"
          />
          <UButton
            variant="outline"
            icon="i-tabler-trash"
            title="Удалить"
            @click="toDelete = layout as Layout"
          />
        </div>
      </div>
    </div>

    <AppEmptyState
      v-else
      icon="i-tabler-layout"
      title="Планировок для этого ЖК нет"
      description="Создайте первую планировку. Её можно будет привязать к квартирам."
    >
      <template #actions>
        <UButton
          icon="i-tabler-plus"
          color="primary"
          @click="openCreate"
        >
          Добавить планировку
        </UButton>
      </template>
    </AppEmptyState>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-6 flex justify-center">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>

    <UModal
      v-model:open="formOpen"
      :title="editing ? 'Редактировать планировку' : 'Новая планировка'"
    >
      <template #body>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Название" required class="sm:col-span-2">
            <UInput v-model="form.name" placeholder="1-комнатная А" />
          </UFormField>
          <UFormField label="Площадь, м²" required>
            <UInput v-model.number="form.area" type="number" step="0.01" min="0" />
          </UFormField>
          <UFormField label="Комнат" required>
            <UInput v-model.number="form.roomsCount" type="number" min="0" />
          </UFormField>
          <UFormField label="Диапазон этажей">
            <UInput v-model="form.floorRange" placeholder="2-16" />
          </UFormField>
          <UFormField label="Диапазон цен">
            <UInput v-model="form.priceRange" placeholder="5 000 000 - 7 000 000" />
          </UFormField>
          <UFormField label="Высота потолков, м">
            <UInput v-model.number="form.ceilingHeight" type="number" step="0.01" />
          </UFormField>
          <UFormField label="Картинка планировки" class="sm:col-span-2">
            <ImageUpload v-model="form.defaultLayoutImage" folder="layouts" />
          </UFormField>
          <UFormField label="С мебелью" class="sm:col-span-2">
            <ImageUpload v-model="form.furnishedLayoutImage" folder="layouts" />
          </UFormField>
          <UFormField label="3D" class="sm:col-span-2">
            <ImageUpload v-model="form.threeDLayoutImage" folder="layouts" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="formOpen = false">
            Отмена
          </UButton>
          <UButton
            color="primary"
            :loading="isSubmitting"
            :disabled="!form.name.trim() || form.area <= 0"
            @click="submit"
          >
            {{ editing ? "Сохранить" : "Создать" }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      :open="toDelete != null"
      title="Удалить планировку?"
      @update:open="(v) => { if (!v) toDelete = null }"
    >
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">
          Планировка <b>{{ toDelete?.name }}</b> будет удалена. У связанных
          квартир planning будет отвязан. Действие необратимо.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" @click="toDelete = null">
            Отмена
          </UButton>
          <UButton
            color="error"
            icon="i-tabler-trash"
            :loading="deleteMut.isPending.value"
            @click="toDelete && deleteMut.mutate(toDelete.id)"
          >
            Удалить
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
