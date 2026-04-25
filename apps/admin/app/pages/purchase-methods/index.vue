<script setup lang="ts">
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const page = ref(1);
const pageSize = 20;
const search = ref("");
const debouncedSearch = refDebounced(search, 300);
const kindFilter = ref<PurchaseMethodKind>();

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.purchaseMethods.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        search: debouncedSearch.value || undefined,
        kind: kindFilter.value,
      },
      placeholderData: keepPreviousData,
    }),
  ),
);

watch([debouncedSearch, kindFilter], () => {
  page.value = 1;
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.purchaseMethods.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Способ удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.purchaseMethods.key() });
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Способы покупки"
      :subtitle="data?.total != null ? `${data.total} способов` : undefined"
    >
      <template #actions>
        <UButton
          to="/purchase-methods/create"
          icon="i-tabler-plus"
          color="primary"
        >
          Новый способ
        </UButton>
      </template>
    </AppPageHeader>

    <div class="mb-4 flex items-center gap-2 flex-wrap">
      <UInput
        v-model="search"
        placeholder="Поиск…"
        icon="i-tabler-search"
        size="sm"
        class="max-w-xs"
      />
      <USelect
        v-model="kindFilter"
        :items="purchaseMethodKindOptions"
        placeholder="Все типы"
        size="sm"
        class="max-w-[200px]"
      />
      <UButton
        v-if="kindFilter"
        variant="ghost"
        icon="i-tabler-x"
        title="Сбросить"
        @click="kindFilter = undefined"
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
          <div
            class="size-10 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0"
          >
            <UIcon
              :name="item.icon || purchaseMethodKindIcons[item.kind]"
              class="size-5 text-(--ui-text-dimmed)"
            />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <NuxtLink
                :to="`/purchase-methods/${item.id}`"
                class="text-sm font-semibold truncate hover:underline"
              >
                {{ item.title }}
              </NuxtLink>
              <AppStatusPill
                tone="muted"
                :label="purchaseMethodKindLabels[item.kind]"
              />
              <AppStatusPill
                :tone="item.isActive ? 'success' : 'muted'"
                :label="item.isActive ? 'Активен' : 'Скрыт'"
                dot
              />
            </div>
            <p
              v-if="item.description"
              class="text-xs text-(--ui-text-muted) line-clamp-1 mt-0.5"
            >
              {{ item.description }}
            </p>
            <p
              v-if="item.methodProjects?.length"
              class="text-[11px] text-(--ui-text-dimmed) mt-0.5 truncate"
            >
              {{ item.methodProjects.map((mp) => mp.project.name).join(", ") }}
            </p>
            <p
              v-else
              class="text-[11px] text-(--ui-text-dimmed) mt-0.5"
            >
              Для всех проектов
            </p>
          </div>

          <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
            <UButton
              :to="`/purchase-methods/${item.id}`"
              variant="ghost"
              icon="i-tabler-edit"
              title="Редактировать"
            />
            <UButton
              variant="ghost"
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
      icon="i-tabler-credit-card"
      title="Способы покупки не настроены"
      description="Добавьте рассрочки, ипотеки и другие способы оплаты."
    >
      <template #actions>
        <UButton
          to="/purchase-methods/create"
          icon="i-tabler-plus"
          color="primary"
        >
          Добавить способ
        </UButton>
      </template>
    </AppEmptyState>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-4 flex justify-center">
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="pageSize"
      />
    </div>
  </PageContainer>
</template>
