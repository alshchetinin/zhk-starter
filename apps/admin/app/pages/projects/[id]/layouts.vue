<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const props = defineProps<{
  project: any;
}>();

const { $orpc } = useNuxtApp();
const route = useRoute();
const projectId = computed(() => route.params.id as string);

const page = ref(1);
const pageSize = 20;

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.apartmentLayouts.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        projectId: projectId.value,
      },
    }),
  ),
);
</script>

<template>
  <div>
    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Loading layouts...</span>
    </div>

    <div v-else-if="data?.data.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <NuxtLink
        v-for="layout in data.data"
        :key="layout.id"
        :to="`/layouts/${layout.id}`"
        class="rounded-lg border border-(--ui-border) bg-(--ui-bg) overflow-hidden transition-shadow hover:shadow-md"
      >
        <!-- Image -->
        <div v-if="layout.defaultLayoutImage" class="aspect-square bg-(--ui-bg-elevated)">
          <img :src="layout.defaultLayoutImage" :alt="layout.name" class="size-full object-contain" />
        </div>
        <div v-else class="aspect-square bg-(--ui-bg-elevated) flex items-center justify-center">
          <UIcon name="i-tabler-layout" class="size-12 text-(--ui-text-muted)" />
        </div>

        <!-- Info -->
        <div class="p-3">
          <h3 class="font-semibold text-sm truncate">{{ layout.name }}</h3>
          <div class="mt-1 flex items-center gap-3 text-xs text-(--ui-text-muted)">
            <span>{{ layout.roomsCount === 0 ? 'Studio' : `${layout.roomsCount} rooms` }}</span>
            <span>{{ layout.area }} m²</span>
          </div>
          <div v-if="layout.tags?.length" class="mt-2 flex flex-wrap gap-1">
            <UBadge
              v-for="lt in layout.tags"
              :key="lt.tag.id"
              :label="lt.tag.name"
              size="sm"
              variant="subtle"
              color="neutral"
            />
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-12 text-center">
      <UIcon name="i-tabler-layout" class="mx-auto size-12 text-(--ui-text-muted)" />
      <p class="mt-2 text-(--ui-text-muted)">No layouts found for this project</p>
    </div>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-6 flex justify-center">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>
  </div>
</template>
