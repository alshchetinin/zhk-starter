<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const route = useRoute();
const id = computed(() => route.params.id as string);

const { data: layout, isPending } = useQuery(
  computed(() => $orpc.apartmentLayouts.getById.queryOptions({ input: { id: id.value } })),
);
</script>

<template>
  <PageContainer>
    <!-- Breadcrumb -->
    <UBreadcrumb
      :items="[
        { label: 'Layouts', to: '/layouts', icon: 'i-tabler-layout' },
        { label: layout?.name ?? '...' },
      ]"
      class="mb-6"
    />

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Loading...</span>
    </div>

    <template v-else-if="layout">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold">{{ layout.name }}</h1>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Left: Images -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Info -->
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div class="flex items-start gap-3">
                <UIcon name="i-tabler-home" class="mt-0.5 size-4 text-(--ui-text-muted)" />
                <div>
                  <p class="text-xs text-(--ui-text-muted)">Rooms</p>
                  <p class="text-sm font-medium">{{ layout.roomsCount === 0 ? 'Studio' : layout.roomsCount }}</p>
                </div>
              </div>
              <div class="flex items-start gap-3">
                <UIcon name="i-tabler-ruler-2" class="mt-0.5 size-4 text-(--ui-text-muted)" />
                <div>
                  <p class="text-xs text-(--ui-text-muted)">Area</p>
                  <p class="text-sm font-medium">{{ layout.area }} m²</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Default Layout Image -->
          <div v-if="layout.defaultLayoutImage" class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
            <h3 class="mb-3 font-semibold">Layout Image</h3>
            <img
              :src="layout.defaultLayoutImage"
              :alt="layout.name"
              class="w-full rounded-lg bg-(--ui-bg-elevated)"
            />
          </div>

          <div v-if="!layout.defaultLayoutImage" class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-12 text-center">
            <UIcon name="i-tabler-photo-off" class="mx-auto size-12 text-(--ui-text-muted)" />
            <p class="mt-2 text-(--ui-text-muted)">No images available</p>
          </div>
        </div>

        <!-- Right: Tags -->
        <div class="space-y-6">
          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
            <h3 class="mb-3 font-semibold">Tags</h3>
            <div v-if="layout.tags?.length" class="flex flex-wrap gap-2">
              <UBadge
                v-for="tagPivot in layout.tags"
                :key="tagPivot.tagId"
                variant="subtle"
                color="neutral"
              >
                {{ tagPivot.tag.name }}
              </UBadge>
            </div>
            <p v-else class="text-sm text-(--ui-text-muted)">No tags</p>
          </div>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
