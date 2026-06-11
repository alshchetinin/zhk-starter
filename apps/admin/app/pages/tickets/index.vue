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
        ? "i-solar-sort-from-bottom-to-top-linear"
        : "i-solar-sort-from-top-to-bottom-linear"
      : "i-solar-sort-vertical-linear",
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
        icon: "i-solar-trash-bin-trash-linear",
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
    <AppPageHeader
      title="Заявки"
      :subtitle="`${total} ${total === 1 ? 'заявка' : 'заявок'}`"
    >
      <template #actions>
        <UButton
          to="/tickets/settings"
          icon="i-solar-settings-linear"
          variant="outline"
        >
          Настройки
        </UButton>
      </template>
    </AppPageHeader>

    <div class="mb-4 flex items-center gap-2">
      <UInput
        v-model="search"
        placeholder="Поиск по телефону…"
        icon="i-solar-magnifer-linear"
        size="sm"
        class="max-w-xs"
      />
      <USelect
        :model-value="typeFilter ?? '_all'"
        :items="[{ label: 'Все типы', value: '_all' }, ...ticketTypeOptions]"
        size="sm"
        class="max-w-[200px]"
        @update:model-value="typeFilter = $event === '_all' ? undefined : $event"
      />
    </div>

    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
      Загрузка…
    </div>

    <AppEmptyState
      v-else-if="items.length === 0"
      icon="i-solar-inbox-linear"
      title="Заявок пока нет"
      description="Сюда будут поступать заявки с сайта."
    />

    <AppDataCard v-else flush>
      <UTable
        v-model:sorting="sorting"
        :data="items"
        :columns="columns"
        class="w-full"
        @select="onRowClick"
      />
    </AppDataCard>

    <div v-if="totalPages > 1" class="flex justify-center mt-4 gap-2">
      <UButton
        variant="outline"
        :disabled="page <= 1"
        @click="page--"
      >
        Назад
      </UButton>
      <span class="flex items-center text-xs text-(--ui-text-muted) px-3 tabular-nums">
        {{ page }} / {{ totalPages }}
      </span>
      <UButton
        variant="outline"
        :disabled="page >= totalPages"
        @click="page++"
      >
        Вперёд
      </UButton>
    </div>
  </PageContainer>
</template>
