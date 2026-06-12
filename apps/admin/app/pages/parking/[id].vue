<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const route = useRoute();
const id = computed(() => route.params.id as string);

const { data: item, isPending } = useQuery(
  computed(() => $orpc.parking.getById.queryOptions({ input: { id: id.value } })),
);

useHead({
  title: computed(() =>
    item.value ? `Паркинг ${item.value.name ?? ""}`.trim() : undefined,
  ),
});

function formatPrice(price: string | number | null) {
  if (!price) return "—";
  return Number(price).toLocaleString("ru-RU");
}
</script>

<template>
  <PageContainer>
    <UBreadcrumb
      :items="[
        { label: 'Паркинги', to: '/parking', icon: 'i-solar-garage-linear' },
        { label: item ? (item.name ?? '—') : '...' },
      ]"
      class="mb-6"
    />

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-solar-refresh-linear" class="animate-spin" />
      <span>Загрузка…</span>
    </div>

    <template v-else-if="item">
      <div class="mb-6 flex items-center gap-3">
        <h1 class="text-2xl font-bold">Паркинг {{ item.name ?? '' }}</h1>
        <UBadge v-if="!item.isPublished" variant="subtle" color="neutral">Черновик</UBadge>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-6 max-w-2xl">
        <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
          <p class="text-xs text-(--ui-text-muted)">Площадь</p>
          <p class="text-xl font-bold">{{ item.area ?? '—' }} м²</p>
        </div>
        <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
          <p class="text-xs text-(--ui-text-muted)">Цена</p>
          <p class="text-xl font-bold">{{ formatPrice(item.price) }} ₽</p>
        </div>
        <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
          <p class="text-xs text-(--ui-text-muted)">Этаж</p>
          <p class="text-xl font-bold">{{ item.floorNumber ?? '—' }}</p>
        </div>
        <div v-if="item.oldPrice" class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
          <p class="text-xs text-(--ui-text-muted)">Старая цена</p>
          <p class="text-xl font-bold line-through text-(--ui-text-muted)">{{ formatPrice(item.oldPrice) }} ₽</p>
        </div>
      </div>

      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 max-w-2xl">
        <h3 class="mb-3 font-semibold">Связи</h3>
        <div class="space-y-3">
          <NuxtLink
            v-if="item.project"
            :to="`/projects/${item.project.id}`"
            class="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-(--ui-bg-elevated)"
          >
            <UIcon name="i-solar-buildings-linear" class="size-5 text-(--ui-text-muted)" />
            <div>
              <p class="text-xs text-(--ui-text-muted)">Проект</p>
              <p class="text-sm font-medium">{{ item.project.name }}</p>
            </div>
          </NuxtLink>
          <NuxtLink
            v-if="item.building"
            :to="`/buildings/${item.building.id}`"
            class="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-(--ui-bg-elevated)"
          >
            <UIcon name="i-solar-buildings-2-linear" class="size-5 text-(--ui-text-muted)" />
            <div>
              <p class="text-xs text-(--ui-text-muted)">Корпус</p>
              <p class="text-sm font-medium">{{ item.building.name }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
