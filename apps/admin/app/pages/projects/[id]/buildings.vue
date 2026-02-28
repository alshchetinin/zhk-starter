<script setup lang="ts">
const props = defineProps<{
  project: any;
}>();
</script>

<template>
  <div>
    <h2 class="mb-4 text-lg font-semibold">Buildings ({{ project.buildings.length }})</h2>
    <div v-if="project.buildings.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <NuxtLink
        v-for="building in project.buildings"
        :key="building.id"
        :to="`/buildings/${building.id}`"
        class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 transition-shadow hover:shadow-md"
      >
        <div class="flex items-center gap-2 mb-2">
          <UIcon name="i-tabler-building-skyscraper" class="size-5 text-(--ui-text-muted)" />
          <h3 class="font-semibold truncate">{{ building.name }}</h3>
        </div>
        <div v-if="building.completionDate" class="flex items-center gap-1 text-xs text-(--ui-text-muted)">
          <UIcon name="i-tabler-calendar" class="size-3" />
          <span>{{ building.completionDate }}</span>
        </div>
        <div class="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p class="text-xs text-(--ui-text-muted)">Total</p>
            <p class="text-sm font-semibold">{{ building.totalApartmentsCount ?? 0 }}</p>
          </div>
          <div>
            <p class="text-xs text-(--ui-text-muted)">Free</p>
            <p class="text-sm font-semibold text-green-600">{{ building.freeApartmentsCount ?? 0 }}</p>
          </div>
          <div>
            <p class="text-xs text-(--ui-text-muted)">Sold</p>
            <p class="text-sm font-semibold">{{ building.soldApartmentsCount ?? 0 }}</p>
          </div>
        </div>
      </NuxtLink>
    </div>
    <div v-else class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-8 text-center">
      <p class="text-(--ui-text-muted)">No buildings yet</p>
    </div>
  </div>
</template>
