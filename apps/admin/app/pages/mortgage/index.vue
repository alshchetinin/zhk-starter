<script setup lang="ts">
import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const page = ref(1);
const pageSize = 20;
const search = ref("");
const debouncedSearch = refDebounced(search, 300);
const statusFilter = ref<MortgageProgramStatus>();
const bankFilter = ref<string>();

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.mortgagePrograms.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        search: debouncedSearch.value || undefined,
        status: statusFilter.value,
        bankId: bankFilter.value || undefined,
      },
      placeholderData: keepPreviousData,
    }),
  ),
);

const { data: banksData } = useQuery(
  $orpc.banks.list.queryOptions({ input: { page: 1, pageSize: 100 } }),
);

const bankOptions = computed(() =>
  (banksData.value?.data ?? []).map((b) => ({ label: b.name, value: b.id })),
);

watch([debouncedSearch, statusFilter, bankFilter], () => {
  page.value = 1;
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.mortgagePrograms.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Программа удалена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.mortgagePrograms.key() });
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Ипотечные программы"
      :subtitle="data?.total != null ? `${data.total} программ` : undefined"
    >
      <template #actions>
        <UButton to="/mortgage/banks" icon="i-tabler-building-bank" variant="outline">
          Банки
        </UButton>
        <UButton to="/mortgage/create" icon="i-tabler-plus" color="primary">
          Новая программа
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
        v-model="statusFilter"
        :items="mortgageProgramStatusOptions"
        placeholder="Все статусы"
        size="sm"
        class="max-w-[180px]"
      />
      <USelect
        v-model="bankFilter"
        :items="bankOptions"
        placeholder="Все банки"
        size="sm"
        class="max-w-[200px]"
      />
      <UButton
        v-if="bankFilter"
        variant="ghost"
        icon="i-tabler-x"
        @click="bankFilter = undefined"
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
            class="flex items-center justify-center w-14 h-10 rounded-lg bg-(--ui-bg-elevated) shrink-0 overflow-hidden border border-(--ui-border)"
          >
            <img
              v-if="item.bank?.logo"
              :src="item.bank.logo"
              :alt="item.bank.name"
              class="h-full w-full object-contain"
            />
            <UIcon
              v-else
              name="i-tabler-building-bank"
              class="size-5 text-(--ui-text-dimmed)"
            />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <NuxtLink
                :to="`/mortgage/${item.id}`"
                class="text-sm font-semibold truncate hover:underline"
              >
                {{ item.name }}
              </NuxtLink>
              <AppStatusPill
                :tone="(({ active: 'success', archived: 'muted' } as const)[item.status as 'active' | 'archived']) ?? 'muted'"
                :label="mortgageProgramStatusLabels[item.status]"
                dot
              />
              <span v-if="item.bank" class="text-[11px] text-(--ui-text-dimmed) truncate">
                · {{ item.bank.name }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-(--ui-text-muted) tabular-nums">
              <span>
                Ставка
                <b class="text-(--ui-text) ml-0.5">{{ formatPercent(item.rate) }}</b>
              </span>
              <span>ПВ от {{ formatPercent(item.minDownPaymentPercent) }}</span>
              <span>до {{ formatMoney(item.maxLoanAmount) }}</span>
              <span>{{ formatTermMonths(item.termMonths) }}</span>
            </div>
            <p
              v-if="item.programProjects?.length"
              class="text-[11px] text-(--ui-text-dimmed) mt-0.5 truncate"
            >
              {{ item.programProjects.map((pp) => pp.project.name).join(", ") }}
            </p>
            <p v-else class="text-[11px] text-(--ui-text-dimmed) mt-0.5">
              Для всех проектов
            </p>
          </div>

          <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
            <UButton
              :to="`/mortgage/${item.id}`"
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
      icon="i-tabler-coin"
      title="Ипотечных программ не найдено"
      description="Создайте первую программу с банком и ставкой."
    >
      <template #actions>
        <UButton to="/mortgage/create" icon="i-tabler-plus" color="primary">
          Создать программу
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
