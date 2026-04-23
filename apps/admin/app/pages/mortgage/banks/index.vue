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
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/mortgage">
          <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
        </NuxtLink>
        <h1 class="text-2xl font-bold">Банки</h1>
      </div>
      <div class="flex items-center gap-3">
        <UInput
          v-model="search"
          placeholder="Поиск..."
          icon="i-tabler-search"
          class="w-48"
        />
        <NuxtLink to="/mortgage/banks/create">
          <UButton
            icon="i-tabler-plus"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl transition-colors"
          >
            Новый банк
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
        <NuxtLink
          :to="`/mortgage/banks/${item.id}`"
          class="flex items-center justify-center w-20 h-14 rounded-lg bg-(--ui-bg-elevated) shrink-0 overflow-hidden"
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
            class="size-6 text-(--ui-text-muted)"
          />
        </NuxtLink>

        <div class="flex-1 min-w-0">
          <NuxtLink
            :to="`/mortgage/banks/${item.id}`"
            class="text-base font-semibold truncate hover:underline block"
          >
            {{ item.name }}
          </NuxtLink>
          <p
            v-if="item.website"
            class="text-sm text-(--ui-text-muted) truncate"
          >
            {{ item.website }}
          </p>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <NuxtLink :to="`/mortgage/banks/${item.id}`">
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
        name="i-tabler-building-bank"
        class="mx-auto size-12 text-(--ui-text-muted)"
      />
      <p class="mt-2 text-(--ui-text-muted)">Банки не найдены</p>
      <NuxtLink to="/mortgage/banks/create">
        <UButton class="mt-4" icon="i-tabler-plus">Добавить первый банк</UButton>
      </NuxtLink>
    </div>

    <div
      v-if="(data?.total ?? 0) > pageSize"
      class="mt-6 flex justify-center"
    >
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="pageSize"
      />
    </div>
  </PageContainer>
</template>
