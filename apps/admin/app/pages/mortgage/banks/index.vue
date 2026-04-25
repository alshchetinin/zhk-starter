<script setup lang="ts">
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const page = ref(1);
const pageSize = 20;
const search = ref("");
const debouncedSearch = refDebounced(search, 300);

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.banks.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        search: debouncedSearch.value || undefined,
      },
      placeholderData: keepPreviousData,
    }),
  ),
);

watch(debouncedSearch, () => {
  page.value = 1;
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.banks.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Банк удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.banks.key() });
  },
  onError: (error) => {
    toast.add({ title: "Ошибка удаления", description: error.message, color: "error" });
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Банки"
      back="/mortgage"
      :crumbs="[
        { label: 'Ипотека', to: '/mortgage' },
        { label: 'Банки' },
      ]"
      :subtitle="data?.total != null ? `${data.total} банков` : undefined"
    >
      <template #actions>
        <AppToolbarButton
          to="/mortgage/banks/create"
          icon="i-tabler-plus"
          variant="primary"
        >
          Новый банк
        </AppToolbarButton>
      </template>
    </AppPageHeader>

    <div class="mb-4 flex items-center gap-2">
      <UInput
        v-model="search"
        placeholder="Поиск…"
        icon="i-tabler-search"
        size="sm"
        class="max-w-xs"
      />
    </div>

    <div
      v-if="isPending && !data"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <AppDataCard v-else-if="data?.data.length" flush>
      <div class="divide-y divide-(--ui-border)">
        <div
          v-for="item in data.data"
          :key="item.id"
          class="group flex items-center gap-3 px-4 py-3 hover:bg-(--ui-bg-elevated) transition"
        >
          <NuxtLink
            :to="`/mortgage/banks/${item.id}`"
            class="flex items-center justify-center w-16 h-10 rounded-lg bg-(--ui-bg-elevated) shrink-0 overflow-hidden border border-(--ui-border)"
          >
            <img
              v-if="item.logo"
              :src="item.logo"
              :alt="item.name"
              class="h-full w-full object-contain"
            />
            <UIcon
              v-else
              name="i-tabler-building-bank"
              class="size-5 text-(--ui-text-dimmed)"
            />
          </NuxtLink>

          <div class="flex-1 min-w-0">
            <NuxtLink
              :to="`/mortgage/banks/${item.id}`"
              class="text-sm font-semibold truncate hover:underline block"
            >
              {{ item.name }}
            </NuxtLink>
            <p
              v-if="item.website"
              class="text-[11px] text-(--ui-text-dimmed) truncate font-mono mt-0.5"
            >
              {{ item.website }}
            </p>
          </div>

          <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
            <AppToolbarButton
              :to="`/mortgage/banks/${item.id}`"
              variant="subtle"
              icon="i-tabler-edit"
              title="Редактировать"
            />
            <AppToolbarButton
              variant="subtle"
              icon="i-tabler-trash"
              title="Удалить"
              :loading="deleteMutation.isPending.value"
              @click="deleteMutation.mutate(item.id)"
            />
          </div>
        </div>
      </div>
    </AppDataCard>

    <AppEmptyState
      v-else
      icon="i-tabler-building-bank"
      title="Банков пока нет"
      description="Добавьте первый банк, чтобы привязывать к нему ипотечные программы."
    >
      <template #actions>
        <AppToolbarButton
          to="/mortgage/banks/create"
          icon="i-tabler-plus"
          variant="primary"
        >
          Добавить банк
        </AppToolbarButton>
      </template>
    </AppEmptyState>

    <div
      v-if="(data?.total ?? 0) > pageSize"
      class="mt-4 flex justify-center"
    >
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="pageSize"
      />
    </div>
  </PageContainer>
</template>
