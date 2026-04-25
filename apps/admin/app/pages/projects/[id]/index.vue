<script setup lang="ts">
const props = defineProps<{ project: any }>();

const hasCoordinates = computed(() => {
  if (!props.project.coordinates) return false;
  const parts = props.project.coordinates.split(",");
  return (
    parts.length === 2 &&
    !isNaN(parseFloat(parts[0])) &&
    !isNaN(parseFloat(parts[1]))
  );
});
const coordLat = computed(() =>
  hasCoordinates.value ? parseFloat(props.project.coordinates.split(",")[0]) : 0,
);
const coordLng = computed(() =>
  hasCoordinates.value ? parseFloat(props.project.coordinates.split(",")[1]) : 0,
);
</script>

<template>
  <div class="space-y-4">
    <!-- Hero stats -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
      <AppStatHero label="Всего" accent="zinc">
        <template #value>{{ project.totalApartmentsCount ?? 0 }}</template>
      </AppStatHero>
      <AppStatHero label="Свободно" accent="emerald">
        <template #value>{{ project.freeApartmentsCount ?? 0 }}</template>
      </AppStatHero>
      <AppStatHero label="Бронь оплачена" accent="amber">
        <template #value>{{ project.paidReservationCount ?? 0 }}</template>
      </AppStatHero>
      <AppStatHero label="Бронь корп." accent="violet">
        <template #value>{{ project.corporateReservationCount ?? 0 }}</template>
      </AppStatHero>
      <AppStatHero label="Продано" accent="zinc">
        <template #value>{{ project.soldApartmentsCount ?? 0 }}</template>
      </AppStatHero>
    </div>

    <!-- Info -->
    <AppDataCard title="Информация">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
            Адрес
          </p>
          <p class="text-sm font-medium mt-0.5">
            {{ project.address || "—" }}
          </p>
        </div>
        <div>
          <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
            Город
          </p>
          <p class="text-sm font-medium mt-0.5">
            {{ project.city?.name || "—" }}
          </p>
        </div>
        <div>
          <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
            Локация
          </p>
          <p class="text-sm font-medium mt-0.5">{{ project.location || "—" }}</p>
        </div>
        <div>
          <p class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
            Тип
          </p>
          <p class="text-sm font-medium mt-0.5">{{ project.type || "—" }}</p>
        </div>
      </div>
    </AppDataCard>

    <!-- Tags -->
    <AppDataCard v-if="project.tags?.length" title="Теги">
      <div class="flex flex-wrap gap-1.5">
        <AppStatusPill
          v-for="tag in project.tags"
          :key="tag"
          tone="muted"
          :label="tag"
        />
      </div>
    </AppDataCard>

    <!-- Map -->
    <AppDataCard
      v-if="hasCoordinates"
      flush
      title="Расположение на карте"
    >
      <template #actions>
        <span class="text-[11px] text-(--ui-text-dimmed) tabular-nums">
          {{ coordLat }}, {{ coordLng }}
        </span>
      </template>
      <iframe
        :src="`https://yandex.ru/map-widget/v1/?ll=${coordLng},${coordLat}&z=15&pt=${coordLng},${coordLat},pm2rdm`"
        width="100%"
        height="320"
        frameborder="0"
        allowfullscreen
        class="block"
      />
    </AppDataCard>

    <!-- Gallery -->
    <AppDataCard v-if="project.gallery?.length" title="Галерея">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <div
          v-for="(url, i) in project.gallery"
          :key="i"
          class="aspect-video overflow-hidden rounded-lg border border-(--ui-border)"
        >
          <img :src="url" class="h-full w-full object-cover" />
        </div>
      </div>
    </AppDataCard>
  </div>
</template>
