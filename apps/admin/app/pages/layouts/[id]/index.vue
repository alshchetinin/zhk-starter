<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import type { GalleryItem } from "~/types/gallery";

const { $orpc } = useNuxtApp();
const route = useRoute();
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

const gallery = computed<GalleryItem[]>(
  () => (layout.value?.gallery as GalleryItem[] | null) ?? [],
);

const images = computed(() => [
  {
    key: "default",
    label: "Основная",
    url: layout.value?.defaultLayoutImage ?? null,
  },
  {
    key: "furnished",
    label: "С мебелью",
    url: layout.value?.furnishedLayoutImage ?? null,
  },
  {
    key: "3d",
    label: "3D-изображение",
    url: layout.value?.threeDLayoutImage ?? null,
  },
]);

const tourUrl = computed(() => layout.value?.threeDTourUrl ?? null);
</script>

<template>
  <PageContainer>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
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
      >
        <template #actions>
          <AppStatusPill
            v-if="layout.integrationId"
            tone="warning"
            label="Импорт"
          />
          <UButton
            color="primary"
            icon="i-solar-pen-linear"
            label="Редактировать"
            :to="`/layouts/${layout.id}/edit`"
          />
        </template>
      </AppPageHeader>

      <!-- Hero stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <AppStatHero label="Комнаты" accent="violet">
          <template #value>{{ fmtRooms(layout.roomsCount) }}</template>
        </AppStatHero>
        <AppStatHero label="Площадь" accent="sky">
          <template #value>{{ layout.area }}</template>
          <template #sub>
            <span class="text-xs text-(--ui-text-dimmed)">м²</span>
          </template>
        </AppStatHero>
        <AppStatHero label="Высота потолка" accent="amber">
          <template #value>
            {{ layout.ceilingHeight ?? "—" }}
          </template>
          <template v-if="layout.ceilingHeight" #sub>
            <span class="text-xs text-(--ui-text-dimmed)">м</span>
          </template>
        </AppStatHero>
        <AppStatHero label="Квартир с планировкой" accent="emerald">
          <template #value>{{ apartmentsData?.length ?? 0 }}</template>
        </AppStatHero>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <!-- Left: images -->
        <div class="lg:col-span-2 space-y-3">
          <AppDataCard title="Изображения">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div v-for="img in images" :key="img.key" class="space-y-1.5">
                <div
                  class="aspect-square rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) overflow-hidden flex items-center justify-center"
                >
                  <img
                    v-if="img.url"
                    :src="img.url"
                    :alt="img.label"
                    class="w-full h-full object-contain"
                  />
                  <UIcon
                    v-else
                    name="i-solar-gallery-remove-linear"
                    class="size-8 text-(--ui-text-dimmed)"
                  />
                </div>
                <p
                  class="text-xs font-medium text-(--ui-text-muted) text-center"
                >
                  {{ img.label }}
                </p>
              </div>
            </div>
          </AppDataCard>

          <AppDataCard title="3D-тур">
            <div
              v-if="tourUrl"
              class="aspect-video rounded-lg overflow-hidden border border-(--ui-border) bg-(--ui-bg-elevated)"
            >
              <iframe
                :src="tourUrl"
                class="w-full h-full"
                loading="lazy"
                referrerpolicy="no-referrer"
                allow="fullscreen; xr-spatial-tracking"
              />
            </div>
            <AppEmptyState
              v-else
              compact
              icon="i-solar-box-linear"
              title="3D-тура нет"
              description="Добавьте URL виджета через «Редактировать»."
            />
          </AppDataCard>

          <AppDataCard
            :title="`Дополнительные изображения · ${gallery.length}`"
          >
            <div
              v-if="gallery.length"
              class="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div
                v-for="(item, i) in gallery"
                :key="`${item.url}-${i}`"
                class="space-y-2"
              >
                <div
                  class="aspect-video rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) overflow-hidden"
                >
                  <img
                    :src="item.url"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div v-if="item.title || item.description" class="space-y-0.5">
                  <p
                    v-if="item.title"
                    class="text-sm font-medium text-(--ui-text)"
                  >
                    {{ item.title }}
                  </p>
                  <p
                    v-if="item.description"
                    class="text-xs text-(--ui-text-muted)"
                  >
                    {{ item.description }}
                  </p>
                </div>
              </div>
            </div>
            <AppEmptyState
              v-else
              compact
              icon="i-solar-gallery-add-linear"
              title="Нет дополнительных изображений"
              description="Добавьте картинки с подписями через «Редактировать»."
            />
          </AppDataCard>

          <AppDataCard
            flush
            :title="`Квартиры с этой планировкой · ${apartmentsData?.length ?? 0}`"
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
                <UButton
                  :to="`/apartments/${row.original.id}`"
                  variant="ghost"
                  icon="i-solar-eye-linear"
                  title="Открыть"
                />
              </template>
            </UTable>
            <AppEmptyState
              v-else
              compact
              icon="i-solar-home-linear"
              title="Нет квартир"
              description="Эта планировка ещё не привязана к квартирам."
            />
          </AppDataCard>
        </div>

        <!-- Right: parameters / tags / sun -->
        <div class="space-y-3">
          <AppDataCard title="Параметры">
            <dl class="text-sm divide-y divide-(--ui-border)">
              <div class="flex justify-between py-2">
                <dt class="text-(--ui-text-dimmed)">Этажи</dt>
                <dd class="font-medium tabular-nums">
                  {{ layout.floorRange || "—" }}
                </dd>
              </div>
              <div class="flex justify-between py-2">
                <dt class="text-(--ui-text-dimmed)">Цена</dt>
                <dd class="font-medium tabular-nums">
                  {{ layout.priceRange || "—" }}
                </dd>
              </div>
              <div class="flex justify-between py-2">
                <dt class="text-(--ui-text-dimmed)">Высота потолка</dt>
                <dd class="font-medium tabular-nums">
                  {{ layout.ceilingHeight ? `${layout.ceilingHeight} м` : "—" }}
                </dd>
              </div>
              <div class="flex justify-between py-2 gap-3">
                <dt class="text-(--ui-text-dimmed) shrink-0">3D-тур</dt>
                <dd class="font-medium text-right truncate min-w-0">
                  <a
                    v-if="tourUrl"
                    :href="tourUrl"
                    target="_blank"
                    rel="noopener"
                    class="text-(--ui-primary) hover:underline"
                  >
                    Открыть ↗
                  </a>
                  <span v-else class="text-(--ui-text-dimmed)">—</span>
                </dd>
              </div>
              <div class="flex justify-between py-2">
                <dt class="text-(--ui-text-dimmed)">Источник</dt>
                <dd class="font-medium">
                  <span v-if="layout.integration?.type">
                    {{ layout.integration.type }}
                  </span>
                  <span v-else class="text-(--ui-text-dimmed)">Ручной</span>
                </dd>
              </div>
              <div v-if="layout.externalId" class="flex justify-between py-2">
                <dt class="text-(--ui-text-dimmed)">External ID</dt>
                <dd class="font-mono text-xs text-(--ui-text-muted) truncate ml-2">
                  {{ layout.externalId }}
                </dd>
              </div>
            </dl>
          </AppDataCard>

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

        </div>
      </div>
    </template>
  </PageContainer>
</template>
