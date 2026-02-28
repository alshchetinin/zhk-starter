<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const page = ref(1);
const pageSize = 20;
const search = ref("");

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.projects.list.queryOptions({
      input: { page: page.value, pageSize, search: search.value || undefined },
    }),
  ),
);

watch(search, () => {
  page.value = 1;
});

const statusColors: Record<string, "success" | "warning" | "error" | "neutral"> = {
  active: "success",
  planning: "warning",
  completed: "error",
  hidden: "neutral",
};

const syncStatusColors: Record<string, "success" | "warning" | "error" | "neutral"> = {
  success: "success",
  loading: "warning",
  error: "error",
};

// Create project modal
const showCreateModal = ref(false);

// Sync mutation
const syncingProjectId = ref<string | null>(null);
const syncMutation = useMutation({
  mutationFn: (projectId: string) => {
    syncingProjectId.value = projectId;
    return $orpcClient.projects.sync({ id: projectId });
  },
  onSuccess: () => {
    toast.add({
      title: "Синхронизация запущена",
      color: "success",
    });
    queryClient.invalidateQueries({ queryKey: $orpc.projects.key() });
    syncingProjectId.value = null;
  },
  onError: (error: any) => {
    toast.add({
      title: "Ошибка синхронизации",
      description: error.message,
      color: "error",
    });
    syncingProjectId.value = null;
  },
});

function formatDate(date: string | Date | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleString("ru-RU");
}
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Проекты</h1>
      <div class="flex items-center gap-3">
        <UInput
          v-model="search"
          placeholder="Поиск проектов..."
          icon="i-tabler-search"
          class="w-64"
        />
        <UButton
          icon="i-tabler-plus"
          class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl transition-colors"
          @click="showCreateModal = true"
        >
          Новый проект
        </UButton>
      </div>
    </div>

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <div v-else-if="data?.data.length" class="grid grid-cols-1 gap-5">
      <div
        v-for="project in data.data"
        :key="project.id"
        class="flex flex-col sm:flex-row gap-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 transition-shadow hover:shadow-md"
      >
        <!-- Image / Placeholder -->
        <NuxtLink
          :to="`/projects/${project.id}`"
          class="flex items-center justify-center w-full sm:w-40 h-28 sm:h-auto rounded-lg bg-(--ui-bg-elevated) shrink-0 overflow-hidden"
        >
          <img
            v-if="project.gallery?.length"
            :src="project.gallery[0]"
            :alt="project.name"
            class="h-full w-full object-cover"
          />
          <UIcon v-else name="i-tabler-building" class="size-10 text-(--ui-text-muted)" />
        </NuxtLink>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <NuxtLink :to="`/projects/${project.id}`" class="text-lg font-semibold truncate hover:underline">
              {{ project.name }}
            </NuxtLink>
            <UBadge
              :color="statusColors[project.status ?? ''] ?? 'neutral'"
              variant="subtle"
            >
              {{ project.status }}
            </UBadge>
            <UBadge
              v-if="project.lastSyncStatus"
              :color="syncStatusColors[project.lastSyncStatus] ?? 'neutral'"
              variant="subtle"
            >
              sync: {{ project.lastSyncStatus }}
            </UBadge>
          </div>

          <p v-if="project.address" class="text-sm text-(--ui-text-muted) mb-1 truncate">
            {{ project.address }}
          </p>

          <p v-if="project.macroComplexName" class="text-xs text-(--ui-text-dimmed) mb-1">
            MacroCRM: {{ project.macroComplexName }}
          </p>

          <p v-if="project.lastSyncAt" class="text-xs text-(--ui-text-dimmed) mb-3">
            Последний sync: {{ formatDate(project.lastSyncAt) }}
          </p>

          <!-- Stats -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-home" class="size-4 text-blue-500" />
              <div>
                <p class="text-xs text-(--ui-text-muted)">Всего</p>
                <p class="text-sm font-semibold">{{ project.totalApartmentsCount ?? 0 }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-circle-check" class="size-4 text-green-500" />
              <div>
                <p class="text-xs text-(--ui-text-muted)">Свободно</p>
                <p class="text-sm font-semibold">{{ project.freeApartmentsCount ?? 0 }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-circle-x" class="size-4 text-red-500" />
              <div>
                <p class="text-xs text-(--ui-text-muted)">Продано</p>
                <p class="text-sm font-semibold">{{ project.soldApartmentsCount ?? 0 }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-clock" class="size-4 text-yellow-500" />
              <div>
                <p class="text-xs text-(--ui-text-muted)">Бронь</p>
                <p class="text-sm font-semibold">{{ project.paidReservationCount ?? 0 }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-tabler-briefcase" class="size-4 text-purple-500" />
              <div>
                <p class="text-xs text-(--ui-text-muted)">Корп.</p>
                <p class="text-sm font-semibold">{{ project.corporateReservationCount ?? 0 }}</p>
              </div>
            </div>
          </div>

          <!-- Sync button -->
          <UButton
            v-if="project.macroComplexId"
            variant="outline"
            size="xs"
            icon="i-tabler-refresh"
            :loading="syncMutation.isPending.value && syncingProjectId === project.id"
            :disabled="project.lastSyncStatus === 'loading'"
            class="rounded-xl"
            @click.prevent="syncMutation.mutate(project.id)"
          >
            Синхронизировать
          </UButton>
        </div>
      </div>
    </div>

    <div v-else class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-12 text-center">
      <UIcon name="i-tabler-building-off" class="mx-auto size-12 text-(--ui-text-muted)" />
      <p class="mt-2 text-(--ui-text-muted)">Проекты не найдены</p>
      <UButton
        class="mt-4"
        icon="i-tabler-plus"
        @click="showCreateModal = true"
      >
        Создать первый проект
      </UButton>
    </div>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-6 flex justify-center">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>

    <!-- Create Project Modal -->
    <CreateProjectModal v-model:open="showCreateModal" @created="queryClient.invalidateQueries({ queryKey: $orpc.projects.key() })" />
  </PageContainer>
</template>
