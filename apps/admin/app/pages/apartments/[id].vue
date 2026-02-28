<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const route = useRoute();
const id = computed(() => route.params.id as string);

const { data: apartment, isPending } = useQuery(
  computed(() => $orpc.apartments.getById.queryOptions({ input: { id: id.value } })),
);

const statusColors: Record<string, "success" | "warning" | "error" | "neutral"> = {
  free: "success",
  paid_reservation: "warning",
  corporate_reservation: "warning",
  sold: "error",
};

function formatPrice(price: string | number) {
  return Number(price).toLocaleString("ru-RU");
}
</script>

<template>
  <PageContainer>
    <!-- Breadcrumb -->
    <UBreadcrumb
      :items="[
        { label: 'Apartments', to: '/apartments', icon: 'i-tabler-home' },
        { label: apartment ? `#${apartment.apartmentNumber}` : '...' },
      ]"
      class="mb-6"
    />

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Loading...</span>
    </div>

    <template v-else-if="apartment">
      <!-- Header -->
      <div class="mb-6 flex items-center gap-3">
        <h1 class="text-2xl font-bold">Apartment #{{ apartment.apartmentNumber }}</h1>
        <UBadge
          :color="statusColors[apartment.status] ?? 'neutral'"
          variant="subtle"
          size="lg"
        >
          {{ apartment.status.replace(/_/g, " ") }}
        </UBadge>
      </div>

      <!-- Two Column Layout -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Left Column -->
        <div class="space-y-6">
          <!-- Key Characteristics -->
          <div class="grid grid-cols-2 gap-4">
            <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
              <p class="text-xs text-(--ui-text-muted)">Area</p>
              <p class="text-xl font-bold">{{ apartment.area }} m²</p>
            </div>
            <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
              <p class="text-xs text-(--ui-text-muted)">Rooms</p>
              <p class="text-xl font-bold">{{ apartment.roomsCount === 0 ? 'Studio' : apartment.roomsCount }}</p>
            </div>
            <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
              <p class="text-xs text-(--ui-text-muted)">Price</p>
              <p class="text-xl font-bold">{{ formatPrice(apartment.price) }} ₽</p>
            </div>
            <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
              <p class="text-xs text-(--ui-text-muted)">Price / m²</p>
              <p class="text-xl font-bold">
                {{ apartment.area ? formatPrice(Math.round(Number(apartment.price) / Number(apartment.area))) : '—' }} ₽
              </p>
            </div>
          </div>

          <!-- Additional Info -->
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
            <h3 class="mb-4 font-semibold">Details</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex items-start gap-3">
                <UIcon name="i-tabler-stairs" class="mt-0.5 size-4 text-(--ui-text-muted)" />
                <div>
                  <p class="text-xs text-(--ui-text-muted)">Floor</p>
                  <p class="text-sm font-medium">{{ apartment.floorNumber }}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <UIcon name="i-tabler-hash" class="mt-0.5 size-4 text-(--ui-text-muted)" />
                <div>
                  <p class="text-xs text-(--ui-text-muted)">Number</p>
                  <p class="text-sm font-medium">{{ apartment.apartmentNumber }}</p>
                </div>
              </div>
              <div v-if="apartment.ceilingHeight" class="flex items-start gap-3">
                <UIcon name="i-tabler-arrows-vertical" class="mt-0.5 size-4 text-(--ui-text-muted)" />
                <div>
                  <p class="text-xs text-(--ui-text-muted)">Ceiling Height</p>
                  <p class="text-sm font-medium">{{ apartment.ceilingHeight }} m</p>
                </div>
              </div>
              <div v-if="apartment.windowView" class="flex items-start gap-3">
                <UIcon name="i-tabler-window" class="mt-0.5 size-4 text-(--ui-text-muted)" />
                <div>
                  <p class="text-xs text-(--ui-text-muted)">Window View</p>
                  <p class="text-sm font-medium">{{ apartment.windowView }}</p>
                </div>
              </div>
            </div>

            <!-- Old Price -->
            <div v-if="apartment.oldPrice" class="mt-4 flex items-start gap-3">
              <UIcon name="i-tabler-tag" class="mt-0.5 size-4 text-(--ui-text-muted)" />
              <div>
                <p class="text-xs text-(--ui-text-muted)">Old Price</p>
                <p class="text-sm font-medium line-through text-(--ui-text-muted)">{{ formatPrice(apartment.oldPrice) }} ₽</p>
              </div>
            </div>

            <!-- Monthly Mortgage -->
            <div v-if="apartment.monthlyMortgagePayment" class="mt-4 flex items-start gap-3">
              <UIcon name="i-tabler-cash" class="mt-0.5 size-4 text-(--ui-text-muted)" />
              <div>
                <p class="text-xs text-(--ui-text-muted)">Monthly Mortgage</p>
                <p class="text-sm font-medium">{{ formatPrice(apartment.monthlyMortgagePayment) }} ₽/month</p>
              </div>
            </div>
          </div>

          <!-- Decoration -->
          <div v-if="apartment.decoration" class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
            <h3 class="mb-3 font-semibold">Decoration</h3>
            <p class="text-sm font-medium">{{ apartment.decoration.title }}</p>
            <p v-if="apartment.decoration.description" class="mt-1 text-sm text-(--ui-text-muted)">
              {{ apartment.decoration.description }}
            </p>
          </div>

          <!-- Promotions -->
          <div v-if="apartment.promotions?.length" class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
            <h3 class="mb-3 font-semibold">Promotions</h3>
            <div class="space-y-3">
              <div v-for="ap in apartment.promotions" :key="ap.promotion.id" class="flex items-start gap-3">
                <UIcon name="i-tabler-discount-2" class="mt-0.5 size-4 text-amber-500" />
                <div>
                  <p class="text-sm font-medium">{{ ap.promotion.name }}</p>
                  <p v-if="ap.promotion.description" class="text-xs text-(--ui-text-muted)">
                    {{ ap.promotion.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="space-y-6">
          <!-- Layout Image -->
          <div v-if="apartment.apartmentLayout" class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
            <h3 class="mb-3 font-semibold">Layout</h3>
            <img
              v-if="apartment.apartmentLayout.defaultLayoutImage"
              :src="apartment.apartmentLayout.defaultLayoutImage"
              :alt="apartment.apartmentLayout.name"
              class="w-full rounded-lg bg-(--ui-bg-elevated)"
            />
            <div v-else class="flex items-center justify-center h-48 rounded-lg bg-(--ui-bg-elevated)">
              <UIcon name="i-tabler-photo-off" class="size-12 text-(--ui-text-muted)" />
            </div>
            <div class="mt-3 flex items-center justify-between text-sm">
              <span class="font-medium">{{ apartment.apartmentLayout.name }}</span>
              <span class="text-(--ui-text-muted)">{{ apartment.apartmentLayout.area }} m²</span>
            </div>
            <NuxtLink
              :to="`/layouts/${apartment.apartmentLayout.id}`"
              class="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <UIcon name="i-tabler-external-link" class="size-3" />
              View layout
            </NuxtLink>
          </div>

          <!-- Related Objects -->
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
            <h3 class="mb-3 font-semibold">Related</h3>
            <div class="space-y-3">
              <NuxtLink
                v-if="apartment.project"
                :to="`/projects/${apartment.project.id}`"
                class="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-(--ui-bg-elevated)"
              >
                <UIcon name="i-tabler-building" class="size-5 text-(--ui-text-muted)" />
                <div>
                  <p class="text-xs text-(--ui-text-muted)">Project</p>
                  <p class="text-sm font-medium">{{ apartment.project.name }}</p>
                </div>
              </NuxtLink>
              <NuxtLink
                v-if="apartment.building"
                :to="`/buildings/${apartment.building.id}`"
                class="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-(--ui-bg-elevated)"
              >
                <UIcon name="i-tabler-building-skyscraper" class="size-5 text-(--ui-text-muted)" />
                <div>
                  <p class="text-xs text-(--ui-text-muted)">Building</p>
                  <p class="text-sm font-medium">{{ apartment.building.name }}</p>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
