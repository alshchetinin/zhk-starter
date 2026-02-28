<script setup lang="ts">
const props = defineProps<{
  project: any;
}>();
</script>

<template>
  <!-- Info Grid -->
  <div class="mb-8 grid grid-cols-1 gap-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 sm:grid-cols-2 lg:grid-cols-4">
    <div class="flex items-start gap-3">
      <UIcon name="i-tabler-map-pin" class="mt-0.5 size-4 text-(--ui-text-muted)" />
      <div>
        <p class="text-xs text-(--ui-text-muted)">Address</p>
        <p class="text-sm font-medium">{{ project.address || '—' }}</p>
      </div>
    </div>
    <div class="flex items-start gap-3">
      <UIcon name="i-tabler-building" class="mt-0.5 size-4 text-(--ui-text-muted)" />
      <div>
        <p class="text-xs text-(--ui-text-muted)">City</p>
        <p class="text-sm font-medium">{{ project.city?.name || '—' }}</p>
      </div>
    </div>
    <div class="flex items-start gap-3">
      <UIcon name="i-tabler-tag" class="mt-0.5 size-4 text-(--ui-text-muted)" />
      <div>
        <p class="text-xs text-(--ui-text-muted)">Type</p>
        <p class="text-sm font-medium">{{ project.type || '—' }}</p>
      </div>
    </div>
  </div>

  <!-- Apartment Stats -->
  <div>
    <h2 class="mb-4 text-lg font-semibold">Apartments</h2>
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-tabler-home" class="size-4 text-blue-500" />
          <span class="text-xs text-(--ui-text-muted)">Total</span>
        </div>
        <p class="mt-1 text-xl font-bold">{{ project.totalApartmentsCount ?? 0 }}</p>
      </div>
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-tabler-circle-check" class="size-4 text-green-500" />
          <span class="text-xs text-(--ui-text-muted)">Free</span>
        </div>
        <p class="mt-1 text-xl font-bold text-green-600">{{ project.freeApartmentsCount ?? 0 }}</p>
      </div>
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-tabler-circle-x" class="size-4 text-red-500" />
          <span class="text-xs text-(--ui-text-muted)">Sold</span>
        </div>
        <p class="mt-1 text-xl font-bold">{{ project.soldApartmentsCount ?? 0 }}</p>
      </div>
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-tabler-clock" class="size-4 text-yellow-500" />
          <span class="text-xs text-(--ui-text-muted)">Reserved</span>
        </div>
        <p class="mt-1 text-xl font-bold">{{ project.paidReservationCount ?? 0 }}</p>
      </div>
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-tabler-briefcase" class="size-4 text-purple-500" />
          <span class="text-xs text-(--ui-text-muted)">Corporate</span>
        </div>
        <p class="mt-1 text-xl font-bold">{{ project.corporateReservationCount ?? 0 }}</p>
      </div>
    </div>
  </div>
</template>
