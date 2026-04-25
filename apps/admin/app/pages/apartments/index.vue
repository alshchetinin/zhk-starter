<script setup lang="ts">
import { keepPreviousData, useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const page = ref(1);
const pageSize = 20;

const projectFilter = ref("");
const statusFilter = ref("");
const roomsFilter = ref("");
const filterOpen = ref(false);

const { data: projectsData } = useQuery(
  $orpc.projects.list.queryOptions({ input: { page: 1, pageSize: 100 } }),
);

const projectItems = computed(() =>
  projectsData.value?.data.map((p) => ({ label: p.name, value: p.id })) ?? [],
);

const statusItems = [
  { label: "Свободно", value: "free" },
  { label: "Бронь оплачена", value: "paid_reservation" },
  { label: "Бронь корп.", value: "corporate_reservation" },
  { label: "Продано", value: "sold" },
];

const roomsItems = [
  { label: "Студия", value: "0" },
  { label: "1к", value: "1" },
  { label: "2к", value: "2" },
  { label: "3к", value: "3" },
  { label: "4к+", value: "4" },
];

const activeFiltersCount = computed(() => {
  let n = 0;
  if (projectFilter.value) n++;
  if (statusFilter.value) n++;
  if (roomsFilter.value) n++;
  return n;
});

watch([projectFilter, statusFilter, roomsFilter], () => {
  page.value = 1;
});

function clearFilters() {
  projectFilter.value = "";
  statusFilter.value = "";
  roomsFilter.value = "";
}

const { data, isPending } = useQuery(
  computed(() => ({
    ...$orpc.apartments.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        projectId: projectFilter.value || undefined,
        status: (statusFilter.value || undefined) as any,
        roomsCount: roomsFilter.value ? Number(roomsFilter.value) : undefined,
      },
    }),
    placeholderData: keepPreviousData,
  })),
);

const statusTone: Record<string, "success" | "warning" | "info" | "muted"> = {
  free: "success",
  paid_reservation: "warning",
  corporate_reservation: "info",
  sold: "muted",
};
const statusLabel: Record<string, string> = {
  free: "Свободно",
  paid_reservation: "Бронь",
  corporate_reservation: "Корп.",
  sold: "Продано",
};

function fmtPrice(price: string | number) {
  return Number(price).toLocaleString("ru-RU");
}
function fmtRooms(n: number) {
  return n === 0 ? "Студия" : `${n}к`;
}
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Квартиры"
      :subtitle="data?.total != null ? `${data.total} лотов` : undefined"
    >
      <template #actions>
        <UButton
          icon="i-tabler-filter"
          variant="outline"
          @click="filterOpen = true"
        >
          Фильтры
          <span
            v-if="activeFiltersCount"
            class="ml-0.5 px-1.5 py-px rounded bg-(--ui-bg-inverted) text-(--ui-text-inverted) text-[10px] tabular-nums"
          >
            {{ activeFiltersCount }}
          </span>
        </UButton>
      </template>
    </AppPageHeader>

    <USlideover v-model:open="filterOpen" title="Фильтры" side="right">
      <template #body>
        <div class="flex flex-col gap-4 p-4">
          <UFormField label="ЖК">
            <USelect v-model="projectFilter" :items="projectItems" size="sm" />
          </UFormField>
          <UFormField label="Статус">
            <USelect v-model="statusFilter" :items="statusItems" size="sm" />
          </UFormField>
          <UFormField label="Комнаты">
            <USelect v-model="roomsFilter" :items="roomsItems" size="sm" />
          </UFormField>
          <div class="flex gap-2 mt-2">
            <UButton
              color="primary"
              class="flex-1 justify-center"
              @click="filterOpen = false"
            >
              Применить
            </UButton>
            <UButton
              variant="outline"
              class="flex-1 justify-center"
              @click="clearFilters"
            >
              Сбросить
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <AppDataCard v-if="isPending && !data" flush>
      <div
        class="p-12 text-center text-xs text-(--ui-text-dimmed) flex items-center justify-center gap-2"
      >
        <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
        Загрузка…
      </div>
    </AppDataCard>

    <AppDataCard v-else-if="data?.data.length" flush>
      <div
        class="grid grid-cols-[60px_80px_80px_120px_60px_120px_minmax(0,1fr)_40px] gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-(--ui-text-dimmed) border-b border-(--ui-border) font-medium"
      >
        <div>№</div>
        <div>Комн.</div>
        <div class="text-right">м²</div>
        <div class="text-right">Цена</div>
        <div>Этаж</div>
        <div>Статус</div>
        <div>ЖК</div>
        <div></div>
      </div>
      <div class="divide-y divide-(--ui-border)">
        <NuxtLink
          v-for="apt in data.data"
          :key="apt.id"
          :to="`/apartments/${apt.id}`"
          class="group grid grid-cols-[60px_80px_80px_120px_60px_120px_minmax(0,1fr)_40px] gap-3 px-4 py-2.5 text-xs items-center hover:bg-(--ui-bg-elevated) transition"
        >
          <span class="font-semibold tabular-nums">
            {{ apt.apartmentNumber }}
          </span>
          <span class="text-(--ui-text-muted)">{{ fmtRooms(apt.roomsCount) }}</span>
          <span class="tabular-nums text-right">{{ apt.area }}</span>
          <span class="tabular-nums text-right font-medium">
            {{ fmtPrice(apt.price) }} ₽
          </span>
          <span class="tabular-nums text-(--ui-text-muted)">{{ apt.floorNumber }}</span>
          <AppStatusPill
            :tone="statusTone[apt.status] ?? 'muted'"
            :label="statusLabel[apt.status] ?? apt.status"
            dot
          />
          <span class="truncate text-(--ui-text-muted)">
            {{ apt.project?.name ?? "—" }}
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="size-4 text-(--ui-text-dimmed) opacity-0 group-hover:opacity-100 transition justify-self-end"
          />
        </NuxtLink>
      </div>
    </AppDataCard>

    <AppEmptyState
      v-else
      icon="i-tabler-home-off"
      title="Квартиры не найдены"
      description="Измените фильтры или добавьте квартиры через мастер заполнения секции."
    />

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-4 flex justify-center">
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="pageSize"
      />
    </div>
  </PageContainer>
</template>
