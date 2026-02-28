<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const page = ref(1);
const pageSize = 20;
const roomsFilter = ref("");

const roomsItems = [
  { label: "Studio", value: "0" },
  { label: "1 room", value: "1" },
  { label: "2 rooms", value: "2" },
  { label: "3 rooms", value: "3" },
  { label: "4+ rooms", value: "4" },
];

watch(roomsFilter, () => {
  page.value = 1;
});

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.apartmentLayouts.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        roomsCount: roomsFilter.value ? Number(roomsFilter.value) : undefined,
      },
    }),
  ),
);
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Layouts</h1>
      <USelect
        v-model="roomsFilter"
        :items="roomsItems"
        placeholder="All Rooms"
        class="w-36"
      />
    </div>

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Loading...</span>
    </div>

    <div v-else-if="data?.data.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <NuxtLink
        v-for="layout in data.data"
        :key="layout.id"
        :to="`/layouts/${layout.id}`"
        class="rounded-lg border border-(--ui-border) bg-(--ui-bg) overflow-hidden transition-shadow hover:shadow-md"
      >
        <!-- Image -->
        <div class="aspect-square bg-(--ui-bg-elevated)">
          <img
            v-if="layout.defaultLayoutImage"
            :src="layout.defaultLayoutImage"
            :alt="layout.name"
            class="w-full h-full object-contain"
          />
          <div v-else class="flex items-center justify-center w-full h-full">
            <UIcon name="i-tabler-photo-off" class="size-12 text-(--ui-text-muted)" />
          </div>
        </div>

        <!-- Content -->
        <div class="p-4">
          <h3 class="font-semibold truncate mb-1">{{ layout.name }}</h3>
          <div class="flex items-center gap-3 text-sm text-(--ui-text-muted) mb-2">
            <span>{{ layout.roomsCount === 0 ? 'Studio' : `${layout.roomsCount} rooms` }}</span>
            <span>{{ layout.area }} m²</span>
          </div>
          <div v-if="layout.tags?.length" class="flex flex-wrap gap-1">
            <UBadge
              v-for="tagPivot in layout.tags"
              :key="tagPivot.tagId"
              variant="subtle"
              color="neutral"
              size="sm"
            >
              {{ tagPivot.tag.name }}
            </UBadge>
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-12 text-center">
      <UIcon name="i-tabler-layout-off" class="mx-auto size-12 text-(--ui-text-muted)" />
      <p class="mt-2 text-(--ui-text-muted)">No layouts found</p>
    </div>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-6 flex justify-center">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>
  </PageContainer>
</template>
