<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const { user } = useSession();

const { data, isPending } = useQuery({
  ...$orpc.dashboard.overview.queryOptions(),
  staleTime: 0,
  refetchOnMount: "always",
});

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
});
</script>

<template>
  <div class="w-full px-6 py-6 max-w-[1400px] mx-auto">
    <header class="flex items-end justify-between mb-7 gap-4 flex-wrap">
      <div class="min-w-0">
        <p class="text-xs text-(--ui-text-dimmed) mb-1 tracking-wide">
          {{ new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" }) }}
        </p>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ greeting }}{{ user?.name ? `, ${user.name.split(" ")[0]}` : "" }}
        </h1>
      </div>

      <div class="flex items-center gap-1.5">
        <UButton variant="outline" to="/projects/create" icon="i-tabler-plus">ЖК</UButton>
        <UButton variant="outline" to="/buildings" icon="i-tabler-plus">Дом</UButton>
        <UButton variant="outline" to="/news" icon="i-tabler-plus">Новость</UButton>
      </div>
    </header>

    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <DashboardSite v-else-if="data" :data="data" />
  </div>
</template>
