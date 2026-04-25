<script setup lang="ts">
import { keepPreviousData, useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const page = ref(1);
const pageSize = 20;
const roomsFilter = ref("");

const roomsItems = [
  { label: "Студия", value: "0" },
  { label: "1к", value: "1" },
  { label: "2к", value: "2" },
  { label: "3к", value: "3" },
  { label: "4к+", value: "4" },
];

watch(roomsFilter, () => {
  page.value = 1;
});

const { data, isPending } = useQuery(
  computed(() => ({
    ...$orpc.apartmentLayouts.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        roomsCount: roomsFilter.value ? Number(roomsFilter.value) : undefined,
      },
    }),
    placeholderData: keepPreviousData,
  })),
);
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Планировки"
      :subtitle="data?.total != null ? `${data.total} вариантов` : undefined"
    />

    <div class="mb-4 flex items-center gap-2">
      <USelect
        v-model="roomsFilter"
        :items="roomsItems"
        placeholder="Все комнаты"
        size="sm"
        class="max-w-[180px]"
      />
      <UButton
        v-if="roomsFilter"
        variant="ghost"
        icon="i-tabler-x"
        title="Сбросить"
        @click="roomsFilter = ''"
      />
    </div>

    <div
      v-if="isPending && !data"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <div
      v-else-if="data?.data.length"
      class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <NuxtLink
        v-for="layout in data.data"
        :key="layout.id"
        :to="`/layouts/${layout.id}`"
        class="rounded-xl border border-(--ui-border) bg-(--ui-bg) overflow-hidden hover:border-(--ui-text-dimmed) transition"
      >
        <div class="aspect-square bg-(--ui-bg-elevated)">
          <img
            v-if="layout.defaultLayoutImage"
            :src="layout.defaultLayoutImage"
            :alt="layout.name"
            class="w-full h-full object-contain"
          />
          <div v-else class="flex items-center justify-center w-full h-full">
            <UIcon
              name="i-tabler-photo-off"
              class="size-10 text-(--ui-text-dimmed)"
            />
          </div>
        </div>
        <div class="p-3 border-t border-(--ui-border)">
          <div class="flex items-center gap-1.5 mb-1">
            <h3 class="font-semibold text-sm truncate flex-1">{{ layout.name }}</h3>
            <AppStatusPill
              v-if="layout.integrationId"
              tone="warning"
              label="Импорт"
            />
          </div>
          <div
            class="flex items-center gap-3 text-[11px] text-(--ui-text-dimmed) tabular-nums mb-2"
          >
            <span>
              {{ layout.roomsCount === 0 ? "Студия" : `${layout.roomsCount}к` }}
            </span>
            <span>{{ layout.area }} м²</span>
          </div>
          <div v-if="layout.tags?.length" class="flex flex-wrap gap-1">
            <AppStatusPill
              v-for="tagPivot in layout.tags"
              :key="tagPivot.tagId"
              tone="muted"
              :label="tagPivot.tag.name"
            />
          </div>
        </div>
      </NuxtLink>
    </div>

    <AppEmptyState
      v-else
      icon="i-tabler-layout-off"
      title="Планировок не найдено"
      description="Создайте планировки на странице ЖК."
    />

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-4 flex justify-center">
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="pageSize"
      />
    </div>
  </PageContainer>
</template>
