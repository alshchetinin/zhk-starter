<script setup lang="ts">
const props = defineProps<{
  project: any;
}>();

const hasCoordinates = computed(() => {
  if (!props.project.coordinates) return false;
  const parts = props.project.coordinates.split(",");
  return parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]));
});

const coordLat = computed(() => hasCoordinates.value ? parseFloat(props.project.coordinates.split(",")[0]) : 0);
const coordLng = computed(() => hasCoordinates.value ? parseFloat(props.project.coordinates.split(",")[1]) : 0);
</script>

<template>
  <!-- Info Grid -->
  <div class="mb-8 grid grid-cols-1 gap-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 sm:grid-cols-2 lg:grid-cols-4">
    <div class="flex items-start gap-3">
      <UIcon name="i-tabler-map-pin" class="mt-0.5 size-4 text-(--ui-text-muted)" />
      <div>
        <p class="text-xs text-(--ui-text-muted)">Адрес</p>
        <p class="text-sm font-medium">{{ project.address || '—' }}</p>
      </div>
    </div>
    <div class="flex items-start gap-3">
      <UIcon name="i-tabler-building" class="mt-0.5 size-4 text-(--ui-text-muted)" />
      <div>
        <p class="text-xs text-(--ui-text-muted)">Город</p>
        <p class="text-sm font-medium">{{ project.city?.name || '—' }}</p>
      </div>
    </div>
    <div class="flex items-start gap-3">
      <UIcon name="i-tabler-map-2" class="mt-0.5 size-4 text-(--ui-text-muted)" />
      <div>
        <p class="text-xs text-(--ui-text-muted)">Локация</p>
        <p class="text-sm font-medium">{{ project.location || '—' }}</p>
      </div>
    </div>
    <div class="flex items-start gap-3">
      <UIcon name="i-tabler-tag" class="mt-0.5 size-4 text-(--ui-text-muted)" />
      <div>
        <p class="text-xs text-(--ui-text-muted)">Тип</p>
        <p class="text-sm font-medium">{{ project.type || '—' }}</p>
      </div>
    </div>
  </div>

  <!-- Tags -->
  <div v-if="project.tags?.length" class="mb-8">
    <h2 class="mb-3 text-lg font-semibold">Теги</h2>
    <div class="flex flex-wrap gap-2">
      <UBadge
        v-for="tag in project.tags"
        :key="tag"
        variant="subtle"
        color="neutral"
      >
        {{ tag }}
      </UBadge>
    </div>
  </div>

  <!-- Coordinates / Map -->
  <div v-if="hasCoordinates" class="mb-8">
    <h2 class="mb-3 text-lg font-semibold">Расположение на карте</h2>
    <div class="overflow-hidden rounded-lg border border-(--ui-border)">
      <iframe
        :src="`https://yandex.ru/map-widget/v1/?ll=${coordLng},${coordLat}&z=15&pt=${coordLng},${coordLat},pm2rdm`"
        width="100%"
        height="320"
        frameborder="0"
        allowfullscreen
        class="block"
      />
    </div>
    <p class="mt-2 text-xs text-(--ui-text-muted)">
      {{ coordLat }}, {{ coordLng }}
    </p>
  </div>

  <!-- Gallery -->
  <div v-if="project.gallery?.length" class="mb-8">
    <h2 class="mb-3 text-lg font-semibold">Галерея</h2>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <div
        v-for="(url, i) in project.gallery"
        :key="i"
        class="aspect-video overflow-hidden rounded-lg border border-(--ui-border)"
      >
        <img :src="url" class="h-full w-full object-cover" />
      </div>
    </div>
  </div>

  <!-- Apartment Stats -->
  <div>
    <h2 class="mb-4 text-lg font-semibold">Квартиры</h2>
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-tabler-home" class="size-4 text-blue-500" />
          <span class="text-xs text-(--ui-text-muted)">Всего</span>
        </div>
        <p class="mt-1 text-xl font-bold">{{ project.totalApartmentsCount ?? 0 }}</p>
      </div>
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-tabler-circle-check" class="size-4 text-green-500" />
          <span class="text-xs text-(--ui-text-muted)">Свободно</span>
        </div>
        <p class="mt-1 text-xl font-bold text-green-600">{{ project.freeApartmentsCount ?? 0 }}</p>
      </div>
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-tabler-circle-x" class="size-4 text-red-500" />
          <span class="text-xs text-(--ui-text-muted)">Продано</span>
        </div>
        <p class="mt-1 text-xl font-bold">{{ project.soldApartmentsCount ?? 0 }}</p>
      </div>
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-tabler-clock" class="size-4 text-yellow-500" />
          <span class="text-xs text-(--ui-text-muted)">Бронь</span>
        </div>
        <p class="mt-1 text-xl font-bold">{{ project.paidReservationCount ?? 0 }}</p>
      </div>
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-tabler-briefcase" class="size-4 text-purple-500" />
          <span class="text-xs text-(--ui-text-muted)">Корпоративная</span>
        </div>
        <p class="mt-1 text-xl font-bold">{{ project.corporateReservationCount ?? 0 }}</p>
      </div>
    </div>
  </div>
</template>
