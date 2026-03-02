<script setup lang="ts">
import { h, resolveComponent } from "vue";
import type { TableColumn } from "@nuxt/ui";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();
const router = useRouter();

const page = ref(1);
const pageSize = 20;
const typeFilter = ref<string | undefined>();
const search = ref("");
const debouncedSearch = refDebounced(search, 300);

watch([typeFilter, debouncedSearch], () => {
  page.value = 1;
});

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.tickets.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        type: typeFilter.value as any,
        search: debouncedSearch.value || undefined,
      },
    }),
  ),
);

const items = computed(() => data.value?.data ?? []);
const total = computed(() => data.value?.total ?? 0);
const totalPages = computed(() => Math.ceil(total.value / pageSize));

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.tickets.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Заявка удалена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.tickets.key() });
  },
});

function formatDate(date: string) {
  return new Date(date).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortableHeader(column: any, label: string) {
  const isSorted = column.getIsSorted();
  return h(UButton, {
    color: "neutral",
    variant: "ghost",
    label,
    icon: isSorted
      ? isSorted === "asc"
        ? "i-tabler-sort-ascending"
        : "i-tabler-sort-descending"
      : "i-tabler-arrows-sort",
    class: "-mx-2.5",
    onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
  });
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: "phone",
    header: ({ column }) => sortableHeader(column, "Телефон"),
    cell: ({ row }) =>
      h("span", { class: "font-medium text-(--ui-text-highlighted)" }, row.getValue("phone")),
  },
  {
    accessorKey: "name",
    header: ({ column }) => sortableHeader(column, "Имя"),
    cell: ({ row }) => row.getValue("name") || "—",
  },
  {
    accessorKey: "type",
    header: "Тип",
    cell: ({ row }) => {
      const type = row.getValue("type") as TicketType;
      return h(
        UBadge,
        { color: ticketTypeColors[type], variant: "subtle", size: "xs" },
        () => ticketTypeLabels[type],
      );
    },
  },
  {
    accessorKey: "source",
    header: "Источник",
    cell: ({ row }) => row.getValue("source") || "—",
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => sortableHeader(column, "Дата"),
    cell: ({ row }) =>
      h("span", { class: "text-sm text-(--ui-text-muted)" }, formatDate(row.getValue("createdAt"))),
  },
  {
    id: "actions",
    cell: ({ row }) =>
      h(UButton, {
        variant: "ghost",
        icon: "i-tabler-trash",
        size: "xs",
        color: "error",
        onClick: (e: Event) => {
          e.stopPropagation();
          deleteMutation.mutate(row.original.id);
        },
      }),
    meta: { class: { th: "w-10", td: "w-10" } },
  },
];

const sorting = ref([{ id: "createdAt", desc: true }]);

function onRowClick(_e: Event, row: any) {
  router.push(`/tickets/${row.original.id}`);
}
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">Заявки</h1>
        <p class="text-(--ui-text-muted) text-sm mt-1">Входящие заявки с сайта</p>
      </div>
      <NuxtLink to="/tickets/settings">
        <UButton variant="outline" icon="i-tabler-settings" class="rounded-xl">
          Настройки
        </UButton>
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="mb-4 flex items-center gap-3">
      <UInput
        v-model="search"
        placeholder="Поиск по телефону..."
        icon="i-tabler-search"
        class="w-64"
      />
      <USelect
        :model-value="typeFilter ?? '_all'"
        :items="[{ label: 'Все типы', value: '_all' }, ...ticketTypeOptions]"
        class="w-48"
        @update:model-value="typeFilter = $event === '_all' ? undefined : $event"
      />
      <UBadge variant="subtle" color="neutral" class="ml-auto">
        {{ total }} заявок
      </UBadge>
    </div>

    <!-- Loading -->
    <div v-if="isPending" class="flex justify-center py-12">
      <UIcon name="i-tabler-loader-2" class="animate-spin text-2xl" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <UIcon name="i-tabler-inbox" class="text-4xl text-(--ui-text-dimmed) mb-3" />
      <p class="text-(--ui-text-muted)">Заявок пока нет</p>
    </div>

    <!-- Table -->
    <div v-else class="rounded-lg border border-(--ui-border) overflow-hidden">
      <UTable
        v-model:sorting="sorting"
        :data="items"
        :columns="columns"
        class="w-full"
        @select="onRowClick"
      />
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center mt-6 gap-2">
      <UButton variant="outline" size="sm" :disabled="page <= 1" @click="page--">
        Назад
      </UButton>
      <span class="flex items-center text-sm text-(--ui-text-muted) px-3">
        {{ page }} / {{ totalPages }}
      </span>
      <UButton variant="outline" size="sm" :disabled="page >= totalPages" @click="page++">
        Вперёд
      </UButton>
    </div>
  </PageContainer>
</template>
