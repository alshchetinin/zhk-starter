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

useHead({
  title: computed(() =>
    ticket.value ? `Заявка ${ticket.value.phone}` : undefined,
  ),
});

const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.tickets.delete({ id: id.value }),
  onSuccess: () => {
    toast.add({ title: "Заявка удалена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.tickets.key() });
    router.push("/tickets");
  },
});

const retryMutation = useMutation({
  mutationFn: (deliveryId?: string) =>
    $orpcClient.tickets.retryDelivery({ ticketId: id.value, deliveryId }),
  onSuccess: () => {
    toast.add({ title: "Повтор запущен", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.tickets.getById.queryKey({ input: { id: id.value } }) });
  },
});

function formatDateShort(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

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
      <UIcon name="i-solar-refresh-linear" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <template v-else-if="ticket">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/tickets">
            <UButton variant="ghost" icon="i-solar-arrow-left-linear" size="sm" />
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
          icon="i-solar-trash-bin-trash-linear"
         
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

        <!-- Доставка -->
        <div v-if="(ticket as any).deliveries?.length" class="border border-(--ui-border) p-6 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Доставка</h2>
            <UButton
              v-if="(ticket as any).deliveries.some((d: any) => d.status === 'error')"
              variant="outline"
              size="xs"
              icon="i-solar-refresh-linear"
              :loading="retryMutation.isPending.value"
              @click="retryMutation.mutate(undefined)"
            >
              Повторить ошибки
            </UButton>
          </div>
          <div
            v-for="d in (ticket as any).deliveries"
            :key="d.id"
            class="flex items-center gap-3 text-sm"
          >
            <UIcon :name="receiverTypeIcons[d.receiverType] ?? 'i-solar-bell-linear'" class="text-(--ui-text-muted)" />
            <span class="flex-1 text-(--ui-text-highlighted)">{{ d.receiverName }}</span>
            <UBadge :color="deliveryStatusColors[d.status]" variant="subtle" size="xs">
              {{ deliveryStatusLabels[d.status] }}
            </UBadge>
            <span class="text-xs text-(--ui-text-dimmed) tabular-nums">{{ formatDateShort(d.lastAttemptAt) }}</span>
            <UButton
              v-if="d.status === 'error'"
              variant="ghost"
              size="xs"
              icon="i-solar-refresh-linear"
              :loading="retryMutation.isPending.value"
              @click="retryMutation.mutate(d.id)"
            />
          </div>
          <p v-for="d in (ticket as any).deliveries.filter((x: any) => x.error)" :key="d.id + '-err'" class="text-xs text-red-500">
            {{ d.receiverName }}: {{ d.error }}
          </p>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
