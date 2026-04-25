<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data: ticket, isPending } = useQuery(
  computed(() =>
    $orpc.tickets.getById.queryOptions({ input: { id: id.value } }),
  ),
);

const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.tickets.delete({ id: id.value }),
  onSuccess: () => {
    toast.add({ title: "Заявка удалена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.tickets.key() });
    router.push("/tickets");
  },
});

function formatDate(date: string) {
  return new Date(date).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>

<template>
  <PageContainer>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-(--ui-text-muted)"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <template v-else-if="ticket">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/tickets">
            <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
          </NuxtLink>
          <h1 class="text-2xl font-bold">{{ ticket.phone }}</h1>
          <UBadge
            :color="ticketTypeColors[ticket.type as TicketType]"
            variant="subtle"
          >
            {{ ticketTypeLabels[ticket.type as TicketType] }}
          </UBadge>
        </div>
        <UButton
          variant="outline"
          color="error"
          icon="i-tabler-trash"
          class="rounded-md"
          :loading="deleteMutation.isPending.value"
          @click="deleteMutation.mutate()"
        >
          Удалить
        </UButton>
      </div>

      <div class="max-w-2xl space-y-6">
        <!-- Контактные данные -->
        <div class="border border-(--ui-border) p-6 space-y-4">
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
            Контактные данные
          </h2>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-sm text-(--ui-text-dimmed)">Телефон</div>
              <div class="font-medium text-(--ui-text-highlighted)">{{ ticket.phone }}</div>
            </div>
            <div v-if="ticket.name">
              <div class="text-sm text-(--ui-text-dimmed)">Имя</div>
              <div class="text-(--ui-text-highlighted)">{{ ticket.name }}</div>
            </div>
            <div v-if="ticket.email">
              <div class="text-sm text-(--ui-text-dimmed)">Email</div>
              <div class="text-(--ui-text-highlighted)">{{ ticket.email }}</div>
            </div>
          </div>
        </div>

        <!-- Сообщение -->
        <div v-if="ticket.message" class="border border-(--ui-border) p-6 space-y-2">
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Сообщение</h2>
          <p class="text-(--ui-text-muted) whitespace-pre-wrap">{{ ticket.message }}</p>
        </div>

        <!-- Детали -->
        <div class="border border-(--ui-border) p-6 space-y-4">
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Детали</h2>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-(--ui-text-dimmed)">Тип</div>
              <div class="text-(--ui-text-highlighted)">
                {{ ticketTypeLabels[ticket.type as TicketType] }}
              </div>
            </div>
            <div>
              <div class="text-(--ui-text-dimmed)">Дата</div>
              <div class="text-(--ui-text-highlighted)">{{ formatDate(ticket.createdAt) }}</div>
            </div>
            <div v-if="ticket.source">
              <div class="text-(--ui-text-dimmed)">Источник</div>
              <div class="text-(--ui-text-highlighted)">{{ ticket.source }}</div>
            </div>
            <div v-if="ticket.url">
              <div class="text-(--ui-text-dimmed)">Страница</div>
              <div class="text-(--ui-text-highlighted)">{{ ticket.url }}</div>
            </div>
            <div v-if="ticket.apartmentId">
              <div class="text-(--ui-text-dimmed)">Квартира</div>
              <div class="text-(--ui-text-highlighted)">{{ ticket.apartmentId }}</div>
            </div>
          </div>
        </div>

        <!-- UTM -->
        <div v-if="ticket.utm && Object.keys(ticket.utm).length > 0" class="border border-(--ui-border) p-6 space-y-4">
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">UTM-метки</h2>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div v-for="(value, key) in ticket.utm" :key="key">
              <div class="text-(--ui-text-dimmed)">{{ key }}</div>
              <div class="text-(--ui-text-highlighted) font-mono text-xs">{{ value }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
