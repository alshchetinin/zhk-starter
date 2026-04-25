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
      <h2 class="text-sm font-semibold tracking-tight">
        Дома
        <span class="text-(--ui-text-dimmed) tabular-nums ml-1.5">
          {{ project.buildings.length }}
        </span>
      </h2>
      <UButton
        icon="i-tabler-plus"
        color="primary"
        @click="openCreate"
      >
        Добавить дом
      </UButton>
    </div>

    <AppDataCard v-if="project.buildings.length" flush>
      <div class="divide-y divide-(--ui-border)">
        <div
          v-for="building in project.buildings"
          :key="building.id"
          class="group flex items-center gap-3 px-4 py-3 hover:bg-(--ui-bg-elevated) transition"
        >
          <NuxtLink
            :to="`/buildings/${building.id}`"
            class="flex items-center gap-3 flex-1 min-w-0"
          >
            <div
              class="size-10 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0"
            >
              <UIcon
                name="i-tabler-building-skyscraper"
                class="size-5 text-(--ui-text-dimmed)"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold truncate">{{ building.name }}</span>
                <span
                  v-if="building.completionDate"
                  class="text-[11px] text-(--ui-text-dimmed) tabular-nums flex items-center gap-1"
                >
                  <UIcon name="i-tabler-calendar" class="size-3" />
                  {{ building.completionDate }}
                </span>
              </div>
              <div
                class="flex items-center gap-3 text-[11px] text-(--ui-text-muted) tabular-nums mt-1"
              >
                <span>
                  <span class="text-(--ui-text-dimmed)">всего</span>
                  <span class="text-(--ui-text) font-medium ml-1">
                    {{ building.totalApartmentsCount ?? 0 }}
                  </span>
                </span>
                <span class="flex items-center gap-1">
                  <span class="size-1.5 rounded-full bg-emerald-500" />
                  {{ building.freeApartmentsCount ?? 0 }}
                </span>
                <span class="flex items-center gap-1">
                  <span class="size-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  {{ building.soldApartmentsCount ?? 0 }}
                </span>
              </div>
            </div>
          </NuxtLink>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
            <UButton
              variant="ghost"
              icon="i-tabler-edit"
              title="Редактировать"
              @click="openEdit(building)"
            />
            <UButton
              variant="ghost"
              icon="i-tabler-trash"
              title="Удалить"
              @click="toDelete = building"
            />
          </div>
        </div>
      </div>
    </AppDataCard>
    <AppEmptyState
      v-else
      icon="i-tabler-building-skyscraper"
      title="Домов пока нет"
      description="Добавьте первый дом для этого проекта."
    >
      <template #actions>
        <UButton
          icon="i-tabler-plus"
          color="primary"
          @click="openCreate"
        >
          Добавить дом
        </UButton>
      </template>
    </AppEmptyState>

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
          <UButton variant="outline" @click="formOpen = false">
            Отмена
          </UButton>
          <UButton
            color="primary"
            :loading="isSubmitting"
            :disabled="!form.name.trim()"
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
          <UButton variant="outline" @click="toDelete = null">
            Отмена
          </UButton>
          <UButton
            color="error"
            icon="i-tabler-trash"
            :loading="deleteMutation.isPending.value"
            @click="toDelete && deleteMutation.mutate(toDelete.id)"
          >
            Удалить
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
