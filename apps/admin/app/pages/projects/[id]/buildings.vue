<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";

const props = defineProps<{
  project: any;
}>();

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

type Building = {
  id: string;
  name: string;
  completionDate: string | null;
  cameraUrl: string | null;
  integrationId: string | null;
};

const formOpen = ref(false);
const editing = ref<Building | null>(null);
const toDelete = ref<Building | null>(null);

const form = reactive({
  name: "",
  completionDate: "" as string,
  cameraUrl: "" as string,
});

function resetForm() {
  form.name = "";
  form.completionDate = "";
  form.cameraUrl = "";
}

function openCreate() {
  editing.value = null;
  resetForm();
  formOpen.value = true;
}

function openEdit(b: Building) {
  editing.value = b;
  form.name = b.name ?? "";
  form.completionDate = b.completionDate ?? "";
  form.cameraUrl = b.cameraUrl ?? "";
  formOpen.value = true;
}

const projectKey = computed(() =>
  $orpc.projects.getById.queryKey({ input: { id: props.project.id } }),
);

const createMutation = useMutation({
  mutationFn: () =>
    $orpcClient.buildings.create({
      projectId: props.project.id,
      name: form.name.trim(),
      completionDate: form.completionDate || null,
      cameraUrl: form.cameraUrl.trim() || null,
    }),
  onSuccess: () => {
    toast.add({ title: "Дом создан", color: "success" });
    formOpen.value = false;
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: projectKey.value });
    queryClient.invalidateQueries({ queryKey: $orpc.buildings.key() });
  },
});

const updateMutation = useMutation({
  mutationFn: () => {
    if (!editing.value) throw new Error("no building");
    return $orpcClient.buildings.update({
      id: editing.value.id,
      name: form.name.trim(),
      completionDate: form.completionDate || null,
      cameraUrl: form.cameraUrl.trim() || null,
    });
  },
  onMutate: async () => {
    await queryClient.cancelQueries({ queryKey: projectKey.value });
    const prev = queryClient.getQueryData(projectKey.value);
    queryClient.setQueryData(projectKey.value, (old: any) => {
      if (!old?.buildings || !editing.value) return old;
      return {
        ...old,
        buildings: old.buildings.map((b: any) =>
          b.id === editing.value!.id
            ? {
                ...b,
                name: form.name.trim(),
                completionDate: form.completionDate || null,
                cameraUrl: form.cameraUrl.trim() || null,
              }
            : b,
        ),
      };
    });
    return { prev };
  },
  onError: (_e, _v, ctx) => {
    if (ctx) queryClient.setQueryData(projectKey.value, ctx.prev);
  },
  onSuccess: () => {
    toast.add({ title: "Дом обновлён", color: "success" });
    formOpen.value = false;
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: projectKey.value });
    queryClient.invalidateQueries({ queryKey: $orpc.buildings.key() });
  },
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.buildings.delete({ id }),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: projectKey.value });
    const prev = queryClient.getQueryData(projectKey.value);
    queryClient.setQueryData(projectKey.value, (old: any) => {
      if (!old?.buildings) return old;
      return { ...old, buildings: old.buildings.filter((b: any) => b.id !== id) };
    });
    return { prev };
  },
  onError: (_e, _v, ctx) => {
    if (ctx) queryClient.setQueryData(projectKey.value, ctx.prev);
  },
  onSuccess: () => {
    toast.add({ title: "Дом удалён", color: "success" });
    toDelete.value = null;
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: projectKey.value });
    queryClient.invalidateQueries({ queryKey: $orpc.buildings.key() });
  },
});

function submit() {
  if (!form.name.trim()) return;
  if (editing.value) updateMutation.mutate();
  else createMutation.mutate();
}

const isSubmitting = computed(
  () => createMutation.isPending.value || updateMutation.isPending.value,
);
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold">Дома ({{ project.buildings.length }})</h2>
      <UButton
        icon="i-tabler-plus"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
        @click="openCreate"
      >
        Добавить дом
      </UButton>
    </div>

    <div
      v-if="project.buildings.length"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <div
        v-for="building in project.buildings"
        :key="building.id"
        class="relative rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 transition-shadow hover:shadow-md"
      >
        <NuxtLink :to="`/buildings/${building.id}`" class="block">
          <div class="flex items-center gap-2 mb-2 pr-16">
            <UIcon name="i-tabler-building-skyscraper" class="size-5 text-(--ui-text-muted)" />
            <h3 class="font-semibold truncate">{{ building.name }}</h3>
          </div>
          <div v-if="building.completionDate" class="flex items-center gap-1 text-xs text-(--ui-text-muted)">
            <UIcon name="i-tabler-calendar" class="size-3" />
            <span>{{ building.completionDate }}</span>
          </div>
          <div class="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p class="text-xs text-(--ui-text-muted)">Всего</p>
              <p class="text-sm font-semibold">{{ building.totalApartmentsCount ?? 0 }}</p>
            </div>
            <div>
              <p class="text-xs text-(--ui-text-muted)">Свободно</p>
              <p class="text-sm font-semibold text-green-600">{{ building.freeApartmentsCount ?? 0 }}</p>
            </div>
            <div>
              <p class="text-xs text-(--ui-text-muted)">Продано</p>
              <p class="text-sm font-semibold">{{ building.soldApartmentsCount ?? 0 }}</p>
            </div>
          </div>
        </NuxtLink>
        <div class="absolute top-2 right-2 flex gap-1">
          <UButton
            variant="ghost"
            size="xs"
            icon="i-tabler-edit"
            class="rounded-lg"
            @click.stop="openEdit(building)"
          />
          <UButton
            variant="ghost"
            size="xs"
            icon="i-tabler-trash"
            color="error"
            class="rounded-lg"
            @click.stop="toDelete = building"
          />
        </div>
      </div>
    </div>
    <div v-else class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-8 text-center">
      <p class="text-(--ui-text-muted)">Домов пока нет</p>
    </div>

    <!-- Create / Edit modal -->
    <UModal
      v-model:open="formOpen"
      :title="editing ? 'Редактировать дом' : 'Новый дом'"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Название" required>
            <UInput v-model="form.name" placeholder="Литер 1" />
          </UFormField>
          <UFormField label="Дата сдачи" hint="YYYY-MM-DD">
            <UInput v-model="form.completionDate" type="date" />
          </UFormField>
          <UFormField label="Ссылка на камеру">
            <UInput v-model="form.cameraUrl" placeholder="https://..." />
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
            :disabled="!form.name.trim()"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
            @click="submit"
          >
            {{ editing ? "Сохранить" : "Создать" }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete confirm -->
    <UModal
      :open="toDelete != null"
      title="Удалить дом?"
      @update:open="(v) => { if (!v) toDelete = null }"
    >
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">
          Дом <b>{{ toDelete?.name }}</b> будет удалён вместе с секциями, этажами,
          квартирами, коммерцией, паркингом и кладовыми. Действие необратимо.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" class="rounded-xl" @click="toDelete = null">
            Отмена
          </UButton>
          <UButton
            color="error"
            :loading="deleteMutation.isPending.value"
            class="rounded-xl"
            @click="toDelete && deleteMutation.mutate(toDelete.id)"
          >
            Удалить
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
