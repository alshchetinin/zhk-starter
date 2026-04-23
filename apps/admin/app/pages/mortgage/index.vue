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
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Ипотечные программы</h1>
      <div class="flex items-center gap-3">
        <UInput
          v-model="search"
          placeholder="Поиск..."
          icon="i-tabler-search"
          class="w-48"
        />
        <USelect
          v-model="statusFilter"
          :items="mortgageProgramStatusOptions"
          placeholder="Все статусы"
          class="w-36"
        />
        <div class="flex items-center gap-1">
          <USelect
            v-model="bankFilter"
            :items="bankOptions"
            placeholder="Все банки"
            class="w-40"
          />
          <UButton
            v-if="bankFilter"
            variant="ghost"
            size="xs"
            icon="i-tabler-x"
            @click="bankFilter = undefined"
          />
        </div>
        <NuxtLink to="/mortgage/banks">
          <UButton
            variant="outline"
            icon="i-tabler-building-bank"
            class="rounded-xl"
          >
            Банки
          </UButton>
        </NuxtLink>
        <NuxtLink to="/mortgage/create">
          <UButton
            icon="i-tabler-plus"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl transition-colors"
          >
            Новая программа
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <div
      v-if="isPending"
      class="flex items-center gap-2 text-(--ui-text-muted)"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <div v-else-if="data?.data.length" class="grid grid-cols-1 gap-4">
      <div
        v-for="item in data.data"
        :key="item.id"
        class="flex items-center gap-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 transition-shadow hover:shadow-md"
      >
        <div
          class="flex items-center justify-center w-16 h-12 rounded-lg bg-(--ui-bg-elevated) shrink-0 overflow-hidden"
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
            class="size-5 text-(--ui-text-muted)"
          />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <NuxtLink
              :to="`/mortgage/${item.id}`"
              class="text-base font-semibold truncate hover:underline"
            >
              {{ item.name }}
            </NuxtLink>
            <UBadge
              :color="mortgageProgramStatusColors[item.status]"
              variant="subtle"
            >
              {{ mortgageProgramStatusLabels[item.status] }}
            </UBadge>
            <span
              v-if="item.bank"
              class="text-sm text-(--ui-text-muted) truncate"
            >
              {{ item.bank.name }}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-(--ui-text-muted)">
            <span>Ставка: <b class="text-(--ui-text)">{{ formatPercent(item.rate) }}</b></span>
            <span>Первый взнос от: {{ formatPercent(item.minDownPaymentPercent) }}</span>
            <span>Сумма до: {{ formatMoney(item.maxLoanAmount) }}</span>
            <span>Срок: {{ formatTermMonths(item.termMonths) }}</span>
          </div>
          <p
            v-if="item.programProjects?.length"
            class="text-xs text-(--ui-text-dimmed) mt-1 truncate"
          >
            Проекты: {{ item.programProjects.map((pp) => pp.project.name).join(", ") }}
          </p>
          <p v-else class="text-xs text-(--ui-text-dimmed) mt-1">Для всех проектов</p>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <NuxtLink :to="`/mortgage/${item.id}`">
            <UButton
              variant="ghost"
              size="xs"
              icon="i-tabler-edit"
              class="rounded-lg"
            />
          </NuxtLink>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-tabler-trash"
            color="error"
            class="rounded-lg"
            :loading="deleteMutation.isPending.value"
            @click="deleteMutation.mutate(item.id)"
          />
        </div>
      </div>
    </div>

    <div
      v-else
      class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-12 text-center"
    >
      <UIcon
        name="i-tabler-coin"
        class="mx-auto size-12 text-(--ui-text-muted)"
      />
      <p class="mt-2 text-(--ui-text-muted)">Ипотечные программы не найдены</p>
      <NuxtLink to="/mortgage/create">
        <UButton class="mt-4" icon="i-tabler-plus">Создать первую программу</UButton>
      </NuxtLink>
    </div>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-6 flex justify-center">
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="pageSize"
      />
    </div>
  </PageContainer>
</template>
