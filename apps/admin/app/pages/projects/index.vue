<script setup lang="ts">
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const page = ref(1);
const pageSize = 20;
const search = ref("");

const { data, isPending } = useQuery(
  computed(() => ({
    ...$orpc.projects.list.queryOptions({
      input: { page: page.value, pageSize, search: search.value || undefined },
    }),
    placeholderData: keepPreviousData,
  })),
);

watch(search, () => {
  page.value = 1;
});

function prefetchProject(id: string) {
  queryClient.prefetchQuery(
    $orpc.projects.getById.queryOptions({ input: { id } }),
  );
}

const statusTone: Record<
  string,
  "success" | "warning" | "error" | "muted"
> = {
  active: "success",
  planning: "warning",
  completed: "muted",
  hidden: "muted",
};
const statusLabel: Record<string, string> = {
  active: "Активный",
  planning: "Планируется",
  completed: "Завершён",
  hidden: "Скрыт",
};

const syncTone: Record<string, "success" | "warning" | "error"> = {
  success: "success",
  loading: "warning",
  failed: "error",
};

const syncAllMutation = useMutation({
  mutationFn: () => $orpcClient.projects.syncAll(),
  onSuccess: (result) => {
    toast.add({
      title: "Синхронизация запущена",
      description: `Проектов: ${result.started}`,
      color: "success",
    });
    queryClient.invalidateQueries({ queryKey: $orpc.projects.key() });
  },
  onError: (e: any) =>
    toast.add({ title: "Ошибка", description: e.message, color: "error" }),
});

const hasSyncableProjects = computed(
  () =>
    data.value?.data.some(
      (p) => p.macroComplexId && p.lastSyncStatus !== "loading",
    ) ?? false,
);

const showDeleteId = ref<string | null>(null);
const projectToDelete = computed(
  () => data.value?.data.find((p) => p.id === showDeleteId.value) ?? null,
);

type ProjectsListData = typeof data extends { value: infer V } ? V : never;

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.projects.delete({ id }),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: $orpc.projects.list.key() });
    const snapshots = queryClient.getQueriesData<ProjectsListData>({
      queryKey: $orpc.projects.list.key(),
    });
    for (const [key, prev] of snapshots) {
      if (!prev) continue;
      queryClient.setQueryData(key, {
        ...prev,
        data: prev.data.filter((p) => p.id !== id),
        total: Math.max(0, prev.total - 1),
      });
    }
    return { snapshots };
  },
  onError: (_err, _id, ctx) => {
    for (const [key, prev] of ctx?.snapshots ?? []) {
      queryClient.setQueryData(key, prev);
    }
    toast.add({ title: "Не удалось удалить проект", color: "error" });
  },
  onSuccess: () => {
    toast.add({ title: "Проект удалён", color: "success" });
    showDeleteId.value = null;
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: $orpc.projects.key() });
  },
});

function fmtRelative(d: string | Date | null | undefined) {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ч назад`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd} дн назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function soldPct(p: { soldApartmentsCount?: number | null; totalApartmentsCount?: number | null }) {
  const total = p.totalApartmentsCount ?? 0;
  if (!total) return 0;
  return Math.round(((p.soldApartmentsCount ?? 0) / total) * 100);
}
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Проекты"
      :subtitle="
        data?.total != null ? `${data.total} ЖК` : undefined
      "
    >
      <template #actions>
        <AppToolbarButton
          v-if="hasSyncableProjects"
          icon="i-tabler-refresh"
          variant="ghost"
          :loading="syncAllMutation.isPending.value"
          @click="syncAllMutation.mutate()"
        >
          Синхронизировать все
        </AppToolbarButton>
        <AppToolbarButton
          to="/projects/create"
          icon="i-tabler-plus"
          variant="primary"
        >
          Новый ЖК
        </AppToolbarButton>
      </template>
    </AppPageHeader>

    <!-- Search -->
    <div class="mb-4">
      <UInput
        v-model="search"
        placeholder="Поиск по названию или адресу"
        icon="i-tabler-search"
        size="sm"
        class="max-w-sm"
      />
    </div>

    <!-- List -->
    <AppDataCard v-if="isPending && !data" flush>
      <div class="p-12 text-center text-xs text-(--ui-text-dimmed) flex items-center justify-center gap-2">
        <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
        Загрузка…
      </div>
    </AppDataCard>

    <AppDataCard v-else-if="data?.data.length" flush>
      <div class="divide-y divide-(--ui-border)">
        <div
          v-for="project in data.data"
          :key="project.id"
          class="group relative flex items-stretch gap-4 px-4 py-3 hover:bg-(--ui-bg-elevated) transition"
          @mouseenter="prefetchProject(project.id)"
        >
          <!-- Thumbnail -->
          <NuxtLink
            :to="`/projects/${project.id}`"
            class="size-14 rounded-lg bg-(--ui-bg-elevated) shrink-0 overflow-hidden flex items-center justify-center border border-(--ui-border)"
          >
            <img
              v-if="project.gallery?.length"
              :src="project.gallery[0]"
              :alt="project.name"
              class="h-full w-full object-cover"
            />
            <UIcon
              v-else
              name="i-tabler-building"
              class="size-5 text-(--ui-text-dimmed)"
            />
          </NuxtLink>

          <!-- Main content -->
          <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
            <div class="flex items-center gap-2 flex-wrap">
              <NuxtLink
                :to="`/projects/${project.id}`"
                class="text-sm font-semibold truncate hover:underline"
              >
                {{ project.name }}
              </NuxtLink>
              <AppStatusPill
                v-if="project.status"
                :tone="statusTone[project.status] ?? 'muted'"
                :label="statusLabel[project.status] ?? project.status"
                dot
              />
              <AppStatusPill
                v-if="project.lastSyncStatus"
                :tone="syncTone[project.lastSyncStatus] ?? 'muted'"
                :pulse="project.lastSyncStatus === 'loading'"
                dot
              >
                sync
              </AppStatusPill>
              <span
                v-if="project.macroComplexName"
                class="text-[11px] text-(--ui-text-dimmed) truncate"
              >
                · MacroCRM: {{ project.macroComplexName }}
              </span>
            </div>

            <p
              v-if="project.address"
              class="text-xs text-(--ui-text-muted) truncate"
            >
              {{ project.address }}
            </p>

            <!-- Stats inline -->
            <div
              v-if="project.totalApartmentsCount"
              class="flex items-center gap-3 text-[11px] text-(--ui-text-muted) tabular-nums mt-1"
            >
              <span class="flex items-center gap-1">
                <span class="text-(--ui-text-dimmed)">всего</span>
                <span class="text-(--ui-text) font-medium">
                  {{ project.totalApartmentsCount }}
                </span>
              </span>
              <span class="flex items-center gap-1">
                <span class="size-1.5 rounded-full bg-emerald-500" />
                <span>{{ project.freeApartmentsCount ?? 0 }}</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="size-1.5 rounded-full bg-amber-500" />
                <span>{{ project.paidReservationCount ?? 0 }}</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="size-1.5 rounded-full bg-violet-500" />
                <span>{{ project.corporateReservationCount ?? 0 }}</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="size-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                <span>{{ project.soldApartmentsCount ?? 0 }}</span>
              </span>

              <!-- Progress bar inline -->
              <span class="ml-2 flex items-center gap-1.5 min-w-0">
                <span
                  class="w-24 h-1 rounded-full bg-(--ui-bg-elevated) overflow-hidden shrink-0"
                >
                  <span
                    class="block h-full bg-zinc-500"
                    :style="{ width: soldPct(project) + '%' }"
                  />
                </span>
                <span class="text-[10px] text-(--ui-text-dimmed)">
                  {{ soldPct(project) }}% продано
                </span>
              </span>
            </div>
          </div>

          <!-- Right: meta + actions -->
          <div class="flex flex-col items-end gap-2 shrink-0 justify-center">
            <span
              v-if="project.lastSyncAt"
              class="text-[11px] text-(--ui-text-dimmed) tabular-nums"
            >
              sync {{ fmtRelative(project.lastSyncAt) }}
            </span>
            <div
              class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
            >
              <AppToolbarButton
                :to="`/projects/${project.id}`"
                icon="i-tabler-edit"
                variant="subtle"
                title="Редактировать"
              />
              <AppToolbarButton
                icon="i-tabler-trash"
                variant="subtle"
                title="Удалить"
                @click="showDeleteId = project.id"
              />
            </div>
          </div>
        </div>
      </div>
    </AppDataCard>

    <AppEmptyState
      v-else
      icon="i-tabler-building-off"
      title="Проектов пока нет"
      description="Создайте новый ЖК вручную или подключите интеграцию для импорта из MacroCRM / Profitbase."
    >
      <template #actions>
        <AppToolbarButton
          to="/projects/create"
          icon="i-tabler-plus"
          variant="primary"
        >
          Создать ЖК
        </AppToolbarButton>
        <AppToolbarButton
          to="/integrations"
          icon="i-tabler-plug-connected"
          variant="ghost"
        >
          Интеграции
        </AppToolbarButton>
      </template>
    </AppEmptyState>

    <!-- Pagination -->
    <div v-if="(data?.total ?? 0) > pageSize" class="mt-4 flex justify-center">
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="pageSize"
      />
    </div>

    <!-- Delete modal -->
    <UModal
      :open="projectToDelete != null"
      title="Удалить проект?"
      @update:open="(v) => { if (!v) showDeleteId = null }"
    >
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">
          Проект <b>{{ projectToDelete?.name }}</b> будет удалён вместе со
          всеми квартирами, коммерцией, паркингом и кладовыми. Действие
          необратимо.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <AppToolbarButton variant="ghost" @click="showDeleteId = null">
            Отмена
          </AppToolbarButton>
          <button
            class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition disabled:opacity-40"
            :disabled="deleteMutation.isPending.value"
            @click="
              projectToDelete && deleteMutation.mutate(projectToDelete.id)
            "
          >
            <UIcon
              v-if="deleteMutation.isPending.value"
              name="i-tabler-loader-2"
              class="size-3.5 animate-spin"
            />
            <UIcon v-else name="i-tabler-trash" class="size-3.5" />
            Удалить
          </button>
        </div>
      </template>
    </UModal>
  </PageContainer>
</template>
