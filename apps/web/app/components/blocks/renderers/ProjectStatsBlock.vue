<script setup lang="ts">
const props = defineProps<{
  projectId: string;
  showFree: boolean;
  showTotal: boolean;
  project?: {
    name: string;
    freeApartmentsCount: number | null;
    paidReservationCount: number | null;
    corporateReservationCount: number | null;
    soldApartmentsCount: number | null;
    totalApartmentsCount: number | null;
  } | null;
}>();

const stats = computed(() => {
  if (!props.project) return [];
  const items: Array<{ label: string; value: number }> = [];
  if (props.showFree) {
    items.push({ label: "Свободных", value: props.project.freeApartmentsCount ?? 0 });
  }
  if (props.showTotal) {
    items.push({ label: "Всего квартир", value: props.project.totalApartmentsCount ?? 0 });
  }
  return items;
});
</script>

<template>
  <div v-if="project && stats.length" class="section">
    <div class="container-web">
      <div class="rounded-2xl bg-[var(--web-bg-muted)] p-8 md:p-12">
        <h2 v-if="project.name" class="text-2xl font-bold mb-8 text-center">{{ project.name }}</h2>
        <div class="flex flex-wrap gap-8 justify-center">
          <div v-for="stat in stats" :key="stat.label" class="text-center">
            <div class="text-4xl md:text-5xl font-bold text-[var(--web-accent)]">
              {{ stat.value.toLocaleString("ru-RU") }}
            </div>
            <div class="mt-2 text-sm text-[var(--web-text-secondary)]">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
