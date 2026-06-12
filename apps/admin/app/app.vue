<script setup lang="ts">
import { VueQueryDevtools } from "@tanstack/vue-query-devtools";

const route = useRoute();
// На /login нет авторизации — запрос sites.list не делаем (читаем из кеша).
const { currentSite } = useCurrentSite({
  enabled: computed(() => route.path !== "/login"),
});

// Весь head-вход обёрнут в computed: refs, читаемые внутри функции
// titleTemplate, Unhead не трекает — а так запись пересоздаётся при
// изменении currentSite.
useHead(
  computed(() => {
    const suffix = currentSite.value?.name ?? "Админка";
    return {
      titleTemplate: (title?: string | null) =>
        title ? `${title} — ${suffix}` : suffix,
    };
  }),
);
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
  <VueQueryDevtools />
</template>
