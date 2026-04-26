<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const queryClient = useQueryClient();
const id = computed(() => route.params.id as string);

const { data: apartment, isPending } = useQuery(
  computed(() =>
    $orpc.apartments.getById.queryOptions({ input: { id: id.value } }),
  ),
);

const tagIds = ref<string[]>([]);
watch(
  apartment,
  (a) => {
    if (!a) return;
    tagIds.value = (a.apartmentTags ?? []).map(
      (t: { tagId: string }) => t.tagId,
    );
  },
  { immediate: true },
);

const saveTagsMutation = useMutation({
  mutationFn: () =>
    $orpcClient.tags.setApartmentTags({
      apartmentId: id.value,
      tagIds: tagIds.value,
    }),
  onSuccess: () => {
    toast.add({ title: "Теги обновлены", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.apartments.key() });
  },
});

const floorId = computed(() => apartment.value?.floor?.id);

const { data: floorApartments } = useQuery(
  computed(() => ({
    ...$orpc.apartments.listByFloor.queryOptions({
      input: { floorId: floorId.value! },
    }),
    enabled: !!floorId.value,
  })),
);

const apartmentsByNum = computed(() => {
  const map = new Map<string, { id: string; status: string }>();
  for (const a of floorApartments.value ?? []) {
    map.set(a.apartmentNumber, { id: a.id, status: a.status });
  }
  return map;
});

const statusTone: Record<string, "success" | "warning" | "info" | "muted"> = {
  free: "success",
  paid_reservation: "warning",
  corporate_reservation: "info",
  sold: "muted",
};
const statusLabel: Record<string, string> = {
  free: "Свободно",
  paid_reservation: "Бронь оплачена",
  corporate_reservation: "Бронь корп.",
  sold: "Продано",
};

function fmtPrice(price: string | number | null | undefined) {
  if (price == null) return "—";
  return Number(price).toLocaleString("ru-RU");
}
function fmtRooms(n: number) {
  return n === 0 ? "Студия" : `${n}к`;
}

const floorPlanSvg = computed(() => {
  if (!apartment.value?.floor?.svgScheme || !apartment.value.apartmentNumber)
    return null;
  const svg = apartment.value.floor.svgScheme;
  const currentNum = apartment.value.apartmentNumber;
  let result = svg;
  for (const [num, info] of apartmentsByNum.value) {
    const isActive = num === currentNum;
    const attrs = isActive
      ? ` data-active="true" data-apt-id="${info.id}" data-status="${info.status}"`
      : ` data-apt-id="${info.id}" data-status="${info.status}"`;
    result = result.replace(
      new RegExp(`(<path[^>]*data-num="${num}"[^>]*)(/?>)`, "g"),
      `$1${attrs}$2`,
    );
  }
  return result;
});

function onFloorPlanClick(event: MouseEvent) {
  const path = (event.target as Element).closest("path[data-apt-id]");
  if (!path) return;
  const aptId = path.getAttribute("data-apt-id");
  if (aptId && aptId !== id.value) {
    router.push(`/apartments/${aptId}`);
  }
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

    <template v-else-if="apartment">
      <AppPageHeader
        :title="`Квартира №${apartment.apartmentNumber}`"
        back="/apartments"
        :crumbs="[
          { label: 'Квартиры', to: '/apartments' },
          { label: `№${apartment.apartmentNumber}` },
        ]"
      >
        <template #actions>
          <AppStatusPill
            :tone="statusTone[apartment.status] ?? 'muted'"
            :label="statusLabel[apartment.status] ?? apartment.status"
            dot
          />
        </template>
      </AppPageHeader>

      <!-- Hero stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <AppStatHero label="Площадь" accent="sky">
          <template #value>{{ apartment.area }}</template>
          <template #sub>
            <span class="text-xs text-(--ui-text-dimmed)">м²</span>
          </template>
        </AppStatHero>
        <AppStatHero label="Комнаты" accent="violet">
          <template #value>{{ fmtRooms(apartment.roomsCount) }}</template>
        </AppStatHero>
        <AppStatHero label="Цена" accent="emerald">
          <template #value>{{ fmtPrice(apartment.price) }}</template>
          <template #sub>
            <span class="text-xs text-(--ui-text-dimmed)">₽</span>
          </template>
        </AppStatHero>
        <AppStatHero label="₽ / м²" accent="zinc">
          <template #value>
            {{
              apartment.area
                ? fmtPrice(
                    Math.round(Number(apartment.price) / Number(apartment.area)),
                  )
                : "—"
            }}
          </template>
        </AppStatHero>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <!-- Left column -->
        <div class="space-y-3">
          <AppDataCard title="Детали">
            <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                  Этаж
                </p>
                <p class="text-sm font-medium tabular-nums mt-0.5">
                  {{ apartment.floorNumber }}
                </p>
              </div>
              <div>
                <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                  Номер
                </p>
                <p class="text-sm font-medium tabular-nums mt-0.5">
                  {{ apartment.apartmentNumber }}
                </p>
              </div>
              <div v-if="apartment.ceilingHeight">
                <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                  Высота потолков
                </p>
                <p class="text-sm font-medium mt-0.5">
                  {{ apartment.ceilingHeight }} м
                </p>
              </div>
              <div v-if="apartment.windowView">
                <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                  Вид из окна
                </p>
                <p class="text-sm font-medium mt-0.5">
                  {{ apartment.windowView }}
                </p>
              </div>
              <div v-if="apartment.oldPrice">
                <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                  Старая цена
                </p>
                <p class="text-sm font-medium line-through text-(--ui-text-muted) mt-0.5">
                  {{ fmtPrice(apartment.oldPrice) }} ₽
                </p>
              </div>
              <div v-if="apartment.monthlyMortgagePayment">
                <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                  Ипотека / мес
                </p>
                <p class="text-sm font-medium mt-0.5">
                  {{ fmtPrice(apartment.monthlyMortgagePayment) }} ₽
                </p>
              </div>
            </div>
          </AppDataCard>

          <AppDataCard v-if="apartment.decoration" title="Отделка">
            <p class="text-sm font-medium">{{ apartment.decoration.title }}</p>
            <p
              v-if="apartment.decoration.description"
              class="mt-1 text-xs text-(--ui-text-muted)"
            >
              {{ apartment.decoration.description }}
            </p>
          </AppDataCard>

          <AppDataCard v-if="apartment.promotions?.length" title="Акции">
            <div class="space-y-2">
              <div
                v-for="ap in apartment.promotions"
                :key="ap.promotion.id"
                class="flex items-start gap-2"
              >
                <UIcon
                  name="i-tabler-discount-2"
                  class="mt-0.5 size-4 text-amber-500 shrink-0"
                />
                <div class="min-w-0">
                  <p class="text-sm font-medium truncate">{{ ap.promotion.name }}</p>
                  <p
                    v-if="ap.promotion.description"
                    class="text-xs text-(--ui-text-muted)"
                  >
                    {{ ap.promotion.description }}
                  </p>
                </div>
              </div>
            </div>
          </AppDataCard>

          <AppDataCard title="Связанные">
            <div class="space-y-1">
              <NuxtLink
                v-if="apartment.project"
                :to="`/projects/${apartment.project.id}`"
                class="flex items-center gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-(--ui-bg-elevated) transition group"
              >
                <UIcon
                  name="i-tabler-building"
                  class="size-4 text-(--ui-text-dimmed)"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                    ЖК
                  </p>
                  <p class="text-sm font-medium truncate">
                    {{ apartment.project.name }}
                  </p>
                </div>
                <UIcon
                  name="i-tabler-chevron-right"
                  class="size-3.5 text-(--ui-text-dimmed) opacity-0 group-hover:opacity-100 transition"
                />
              </NuxtLink>
              <NuxtLink
                v-if="apartment.building"
                :to="`/buildings/${apartment.building.id}`"
                class="flex items-center gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-(--ui-bg-elevated) transition group"
              >
                <UIcon
                  name="i-tabler-building-skyscraper"
                  class="size-4 text-(--ui-text-dimmed)"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                    Дом
                  </p>
                  <p class="text-sm font-medium truncate">
                    {{ apartment.building.name }}
                  </p>
                </div>
                <UIcon
                  name="i-tabler-chevron-right"
                  class="size-3.5 text-(--ui-text-dimmed) opacity-0 group-hover:opacity-100 transition"
                />
              </NuxtLink>
            </div>
          </AppDataCard>
        </div>

        <!-- Right column -->
        <div class="space-y-3">
          <AppDataCard title="Теги">
            <TagsPicker v-model="tagIds" />
            <div class="mt-3 flex justify-end">
              <UButton
                size="sm"
                color="primary"
                icon="i-tabler-device-floppy"
                :loading="saveTagsMutation.isPending.value"
                @click="saveTagsMutation.mutate()"
              >
                Сохранить теги
              </UButton>
            </div>
          </AppDataCard>

          <AppDataCard v-if="apartment.apartmentLayout" title="Планировка">
            <img
              v-if="apartment.apartmentLayout.defaultLayoutImage"
              :src="apartment.apartmentLayout.defaultLayoutImage"
              :alt="apartment.apartmentLayout.name"
              class="w-full rounded-lg bg-(--ui-bg-elevated)"
            />
            <div
              v-else
              class="flex items-center justify-center h-48 rounded-lg bg-(--ui-bg-elevated)"
            >
              <UIcon
                name="i-tabler-photo-off"
                class="size-10 text-(--ui-text-dimmed)"
              />
            </div>
            <div class="mt-3 flex items-center justify-between text-xs">
              <span class="font-medium">{{ apartment.apartmentLayout.name }}</span>
              <span class="text-(--ui-text-muted) tabular-nums">
                {{ apartment.apartmentLayout.area }} м²
              </span>
            </div>
            <NuxtLink
              :to="`/layouts/${apartment.apartmentLayout.id}`"
              class="mt-2 inline-flex items-center gap-1 text-xs text-(--ui-text-muted) hover:text-(--ui-text) transition"
            >
              <UIcon name="i-tabler-external-link" class="size-3" />
              Открыть планировку
            </NuxtLink>
          </AppDataCard>

          <AppDataCard
            v-if="
              apartment.floor &&
              (apartment.floor.floorImage || apartment.floor.svgScheme)
            "
            :title="`Этаж ${apartment.floorNumber}`"
          >
            <div
              class="relative w-full overflow-hidden rounded-lg bg-(--ui-bg-elevated)"
            >
              <img
                v-if="apartment.floor.floorImage"
                :src="apartment.floor.floorImage"
                :alt="`Этаж ${apartment.floorNumber}`"
                class="block w-full"
              />
              <div
                v-if="floorPlanSvg"
                class="floor-svg-overlay absolute inset-0"
                v-html="floorPlanSvg"
                @click="onFloorPlanClick"
              />
            </div>
          </AppDataCard>
        </div>
      </div>
    </template>
  </PageContainer>
</template>

<style scoped>
.floor-svg-overlay :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
.floor-svg-overlay :deep(path) {
  fill: transparent;
  stroke: none;
  pointer-events: none;
}
.floor-svg-overlay :deep(path[data-apt-id]) {
  pointer-events: all;
  cursor: pointer;
  fill: rgba(59, 130, 246, 0.15);
  stroke: rgba(59, 130, 246, 0.6);
  stroke-width: 2;
  transition: fill 0.15s, stroke 0.15s;
}
.floor-svg-overlay :deep(path[data-apt-id]:hover) {
  fill: rgba(59, 130, 246, 0.4);
  stroke: rgb(37, 99, 235);
  stroke-width: 3;
}
.floor-svg-overlay :deep(path[data-active="true"]) {
  fill: rgba(234, 88, 12, 0.45);
  stroke: rgb(234, 88, 12);
  stroke-width: 3;
}
.floor-svg-overlay :deep(path[data-active="true"]:hover) {
  fill: rgba(234, 88, 12, 0.55);
}
</style>
