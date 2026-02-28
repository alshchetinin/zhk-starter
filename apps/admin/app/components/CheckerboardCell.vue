<script setup lang="ts">
const props = defineProps<{
  apartment: {
    id: string
    apartmentNumber: string
    roomsCount: number
    area: string | number
    price: string | number
    status: string
    apartmentLayoutId?: string | null
  }
}>();

const statusConfig: Record<string, { class: string; label: string }> = {
  sold: {
    class: "bg-red-100 hover:bg-red-200 text-red-700 border-red-200 dark:bg-red-950 dark:hover:bg-red-900 dark:text-red-300 dark:border-red-800",
    label: "Sold",
  },
  corporate_reservation: {
    class: "bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:hover:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-800",
    label: "Corporate",
  },
  paid_reservation: {
    class: "bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 dark:border-blue-800",
    label: "Reserved",
  },
  free: {
    class: "bg-green-100 hover:bg-green-200 text-green-700 border-green-200 dark:bg-green-950 dark:hover:bg-green-900 dark:text-green-300 dark:border-green-800",
    label: "Free",
  },
};

const cellClass = computed(() => statusConfig[props.apartment.status]?.class ?? "");
const statusLabel = computed(() => statusConfig[props.apartment.status]?.label ?? props.apartment.status);

function formatPrice(price: string | number) {
  return Number(price).toLocaleString("ru-RU");
}
</script>

<template>
  <UPopover>
    <template #default>
      <button
        class="flex size-10 items-center justify-center rounded-lg border text-xs font-medium transition-colors duration-200 cursor-pointer"
        :class="cellClass"
      >
        {{ apartment.roomsCount === 0 ? "С" : `${apartment.roomsCount}к` }}
      </button>
    </template>

    <template #content>
      <div class="w-64 p-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">#{{ apartment.apartmentNumber }}</span>
          <UBadge
            :color="apartment.status === 'free' ? 'success' : apartment.status === 'sold' ? 'error' : 'warning'"
            variant="subtle"
            size="sm"
          >
            {{ statusLabel }}
          </UBadge>
        </div>

        <div class="space-y-1.5 text-sm">
          <div class="flex items-center gap-2 text-(--ui-text-muted)">
            <UIcon name="i-tabler-bed" class="size-4" />
            <span>{{ apartment.roomsCount === 0 ? "Studio" : `${apartment.roomsCount} rooms` }}</span>
          </div>
          <div class="flex items-center gap-2 text-(--ui-text-muted)">
            <UIcon name="i-tabler-ruler-2" class="size-4" />
            <span>{{ apartment.area }} m²</span>
          </div>
          <div class="flex items-center gap-2 font-medium">
            <UIcon name="i-tabler-cash" class="size-4" />
            <span>{{ formatPrice(apartment.price) }} ₽</span>
          </div>
        </div>

        <div class="flex gap-2 border-t border-(--ui-border) pt-3">
          <UButton
            :to="`/apartments/${apartment.id}`"
            variant="outline"
            size="xs"
            icon="i-tabler-eye"
            class="flex-1"
          >
            View
          </UButton>
          <UButton
            v-if="apartment.apartmentLayoutId"
            :to="`/layouts/${apartment.apartmentLayoutId}`"
            variant="outline"
            size="xs"
            icon="i-tabler-layout"
            class="flex-1"
          >
            Layout
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>
