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
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Способы покупки</h1>
      <div class="flex items-center gap-3">
        <UInput
          v-model="search"
          placeholder="Поиск..."
          icon="i-tabler-search"
          class="w-48"
        />
        <div class="flex items-center gap-1">
          <USelect
            v-model="kindFilter"
            :items="purchaseMethodKindOptions"
            placeholder="Все типы"
            class="w-48"
          />
          <UButton
            v-if="kindFilter"
            variant="ghost"
            size="xs"
            icon="i-tabler-x"
            @click="kindFilter = undefined"
          />
        </div>
        <NuxtLink to="/purchase-methods/create">
          <UButton
            icon="i-tabler-plus"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) transition-colors"
          >
            Новый способ
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
          class="flex items-center justify-center w-12 h-12 rounded-lg bg-(--ui-bg-elevated) shrink-0"
        >
          <UIcon
            :name="item.icon || purchaseMethodKindIcons[item.kind]"
            class="size-6 text-(--ui-text)"
          />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <NuxtLink
              :to="`/purchase-methods/${item.id}`"
              class="text-base font-semibold truncate hover:underline"
            >
              {{ item.title }}
            </NuxtLink>
            <UBadge variant="subtle">
              {{ purchaseMethodKindLabels[item.kind] }}
            </UBadge>
            <UBadge
              :color="item.isActive ? 'success' : 'neutral'"
              variant="subtle"
            >
              {{ item.isActive ? "Активен" : "Скрыт" }}
            </UBadge>
          </div>
          <p
            v-if="item.description"
            class="text-sm text-(--ui-text-muted) line-clamp-2"
          >
            {{ item.description }}
          </p>
          <p
            v-if="item.methodProjects?.length"
            class="text-xs text-(--ui-text-dimmed) mt-1 truncate"
          >
            Проекты: {{ item.methodProjects.map((mp) => mp.project.name).join(", ") }}
          </p>
          <p v-else class="text-xs text-(--ui-text-dimmed) mt-1">
            Для всех проектов
          </p>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <NuxtLink :to="`/purchase-methods/${item.id}`">
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
        name="i-tabler-credit-card"
        class="mx-auto size-12 text-(--ui-text-muted)"
      />
      <p class="mt-2 text-(--ui-text-muted)">Способы покупки не настроены</p>
      <NuxtLink to="/purchase-methods/create">
        <UButton class="mt-4" icon="i-tabler-plus">Добавить первый способ</UButton>
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
