<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const route = useRoute();
const toast = useToast();
const queryClient = useQueryClient();
const id = computed(() => route.params.id as string);

const { data: layout, isPending } = useQuery(
  computed(() =>
    $orpc.apartmentLayouts.getById.queryOptions({ input: { id: id.value } }),
  ),
);

const { data: apartmentsData, isPending: isApartmentsPending } = useQuery(
  computed(() =>
    $orpc.apartments.listByLayout.queryOptions({ input: { layoutId: id.value } }),
  ),
);

const sunPosition = ref<number>(0);

watch(
  () => layout.value?.sunPosition,
  (val) => {
    sunPosition.value = val ?? 0;
  },
  { immediate: true },
);

const sunMutation = useMutation({
  mutationFn: () =>
    $orpcClient.apartmentLayouts.updateSunPosition({
      id: id.value,
      sunPosition: sunPosition.value,
    }),
  onSuccess: () => {
    toast.add({ title: "Положение солнца сохранено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.apartmentLayouts.key() });
  },
});

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

function fmtRooms(n: number) {
  return n === 0 ? "Студия" : `${n}к`;
}
function fmtPrice(price: string | number) {
  return Number(price).toLocaleString("ru-RU");
}
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

    <template v-else-if="layout">
      <AppPageHeader
        :title="layout.name"
        back="/layouts"
        :crumbs="[
          { label: 'Планировки', to: '/layouts' },
          { label: layout.name },
        ]"
      />

      <!-- Hero stats -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <AppStatHero label="Комнаты" accent="violet">
          <template #value>{{ fmtRooms(layout.roomsCount) }}</template>
        </AppStatHero>
        <AppStatHero label="Площадь" accent="sky">
          <template #value>{{ layout.area }}</template>
          <template #sub>
            <span class="text-xs text-(--ui-text-dimmed)">м²</span>
          </template>
        </AppStatHero>
        <AppStatHero label="Квартир с планировкой" accent="emerald">
          <template #value>{{ apartmentsData?.length ?? 0 }}</template>
        </AppStatHero>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <!-- Left: layout image -->
        <div class="lg:col-span-2 space-y-3">
          <AppDataCard v-if="layout.defaultLayoutImage" title="Планировка">
            <img
              :src="layout.defaultLayoutImage"
              :alt="layout.name"
              class="w-full rounded-lg bg-(--ui-bg-elevated)"
            />
          </AppDataCard>
          <AppDataCard v-else>
            <AppEmptyState
              compact
              icon="i-tabler-photo-off"
              title="Изображения нет"
              description="Загрузите картинку планировки на странице ЖК."
            />
          </AppDataCard>
        </div>

        <!-- Right: meta + sun -->
        <div class="space-y-3">
          <AppDataCard title="Теги">
            <div v-if="layout.tags?.length" class="flex flex-wrap gap-1.5">
              <AppStatusPill
                v-for="tagPivot in layout.tags"
                :key="tagPivot.tagId"
                tone="muted"
                :label="tagPivot.tag.name"
              />
            </div>
            <p v-else class="text-xs text-(--ui-text-dimmed)">Нет тегов</p>
          </AppDataCard>

          <AppDataCard title="Положение солнца">
            <SunPositionSelector v-model="sunPosition" />
            <div class="mt-4 flex">
              <AppToolbarButton
                variant="primary"
                icon="i-tabler-device-floppy"
                :loading="sunMutation.isPending.value"
                @click="sunMutation.mutate()"
              >
                Сохранить
              </AppToolbarButton>
            </div>
          </AppDataCard>
        </div>
      </div>

      <!-- Apartments with this layout -->
      <AppDataCard
        flush
        :title="`Квартиры с этой планировкой · ${apartmentsData?.length ?? 0}`"
        class="mt-3"
      >
        <UTable
          v-if="apartmentsData?.length"
          :data="apartmentsData"
          :columns="[
            { accessorKey: 'apartmentNumber', header: '№' },
            { accessorKey: 'floorNumber', header: 'Этаж' },
            { accessorKey: 'area', header: 'Площадь' },
            { id: 'price', header: 'Цена' },
            { id: 'status', header: 'Статус' },
            { id: 'building', header: 'Корпус' },
            { id: 'actions', header: '' },
          ]"
          :loading="isApartmentsPending"
        >
          <template #price-cell="{ row }">
            <span class="tabular-nums">{{ fmtPrice(row.original.price) }} ₽</span>
          </template>

          <template #status-cell="{ row }">
            <AppStatusPill
              :tone="statusTone[row.original.status] ?? 'muted'"
              :label="statusLabel[row.original.status] ?? row.original.status"
              dot
            />
          </template>

          <template #building-cell="{ row }">
            <NuxtLink
              v-if="row.original.building"
              :to="`/buildings/${row.original.building.id}`"
              class="text-(--ui-text-muted) hover:text-(--ui-text) hover:underline transition"
            >
              {{ row.original.building.name }}
            </NuxtLink>
            <span v-else class="text-(--ui-text-dimmed)">—</span>
          </template>

          <template #actions-cell="{ row }">
            <AppToolbarButton
              :to="`/apartments/${row.original.id}`"
              variant="subtle"
              icon="i-tabler-eye"
              title="Открыть"
            />
          </template>
        </UTable>
        <AppEmptyState
          v-else
          compact
          icon="i-tabler-home-off"
          title="Нет квартир"
          description="Эта планировка ещё не привязана к квартирам."
        />
      </AppDataCard>
    </template>
  </PageContainer>
</template>
