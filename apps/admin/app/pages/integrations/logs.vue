<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();

const statusFilter = ref<"all" | "running" | "success" | "failed" | "cancelled">(
  "all",
);
const page = ref(0);
const limit = 50;

const queryInput = computed(() => ({
  limit,
  offset: page.value * limit,
  ...(statusFilter.value !== "all" ? { status: statusFilter.value } : {}),
}));

const { data, isPending } = useQuery(
  computed(() => $orpc.integration.listLogs.queryOptions({ input: queryInput.value })),
);

const items = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.total ?? 0);

const statusOptions = [
  { value: "all", label: "Все" },
  { value: "success", label: "Успех" },
  { value: "failed", label: "Ошибка" },
  { value: "running", label: "В процессе" },
  { value: "cancelled", label: "Отменено" },
];

const selectedLogId = ref<string | null>(null);
const selectedLog = computed(() =>
  items.value.find((i) => i.id === selectedLogId.value) ?? null,
);

const statusColor = (s: string) =>
  s === "success"
    ? "success"
    : s === "failed"
      ? "error"
      : s === "running"
        ? "warning"
        : "neutral";

const statusLabel = (s: string) =>
  ({
    success: "Успех",
    failed: "Ошибка",
    running: "В процессе",
    cancelled: "Отменено",
  })[s] ?? s;

const triggerLabel = (t: string) =>
  ({ manual: "Вручную", scheduled: "По расписанию", retry: "Повтор" })[t] ?? t;
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">
          Логи синхронизации
        </h1>
        <p class="text-(--ui-text-muted) text-sm mt-1">
          История запусков импорта данных
        </p>
      </div>
      <UButton
        variant="outline"
        icon="i-tabler-settings"
        class="rounded-md"
        to="/integrations/settings"
      >
        Настройки
      </UButton>
    </div>

    <div class="mb-4 flex items-center gap-3">
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        size="md"
        class="w-56"
      />
      <div class="text-sm text-(--ui-text-muted)">
        Всего: {{ total }}
      </div>
    </div>

    <div v-if="isPending" class="flex justify-center py-20">
      <UIcon name="i-tabler-loader-2" class="animate-spin text-3xl" />
    </div>

    <div
      v-else-if="items.length === 0"
      class="text-center py-20 text-(--ui-text-muted)"
    >
      Запусков пока не было
    </div>

    <div v-else class="border border-(--ui-border) overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-elevated)">
          <tr class="text-left text-(--ui-text-muted)">
            <th class="px-4 py-3 font-medium">Старт</th>
            <th class="px-4 py-3 font-medium">Статус</th>
            <th class="px-4 py-3 font-medium">Триггер</th>
            <th class="px-4 py-3 font-medium">Длительность</th>
            <th class="px-4 py-3 font-medium">Статистика</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="log in items"
            :key="log.id"
            class="border-t border-(--ui-border) hover:bg-(--ui-bg-elevated) cursor-pointer"
            @click="selectedLogId = log.id"
          >
            <td class="px-4 py-3 text-(--ui-text-highlighted)">
              {{ fmtDate(log.startedAt) }}
            </td>
            <td class="px-4 py-3">
              <UBadge :color="statusColor(log.status)" variant="subtle">
                {{ statusLabel(log.status) }}
              </UBadge>
            </td>
            <td class="px-4 py-3 text-(--ui-text-muted)">
              {{ triggerLabel(log.trigger) }}
            </td>
            <td class="px-4 py-3 text-(--ui-text-muted)">
              {{ fmtDuration(log.durationMs) }}
            </td>
            <td class="px-4 py-3 text-(--ui-text-muted) text-xs">
              <template v-if="log.stats">
                +{{ log.stats.created ?? 0 }} / ~{{ log.stats.updated ?? 0 }}
              </template>
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="total > limit" class="mt-4 flex justify-center gap-2">
      <UButton
        :disabled="page === 0"
        variant="outline"
        class="rounded-md"
        @click="page = Math.max(0, page - 1)"
      >
        Назад
      </UButton>
      <UButton
        :disabled="(page + 1) * limit >= total"
        variant="outline"
        class="rounded-md"
        @click="page = page + 1"
      >
        Вперёд
      </UButton>
    </div>

    <UModal
      :open="selectedLog != null"
      title="Детали запуска"
      @update:open="(v) => { if (!v) selectedLogId = null }"
    >
      <template #body>
        <div v-if="selectedLog" class="space-y-4 text-sm">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-(--ui-text-dimmed)">Статус</div>
              <UBadge :color="statusColor(selectedLog.status)" variant="subtle">
                {{ statusLabel(selectedLog.status) }}
              </UBadge>
            </div>
            <div>
              <div class="text-(--ui-text-dimmed)">Триггер</div>
              <div>{{ triggerLabel(selectedLog.trigger) }}</div>
            </div>
            <div>
              <div class="text-(--ui-text-dimmed)">Старт</div>
              <div>{{ fmtDate(selectedLog.startedAt) }}</div>
            </div>
            <div>
              <div class="text-(--ui-text-dimmed)">Завершение</div>
              <div>{{ fmtDate(selectedLog.finishedAt) }}</div>
            </div>
            <div>
              <div class="text-(--ui-text-dimmed)">Длительность</div>
              <div>{{ fmtDuration(selectedLog.durationMs) }}</div>
            </div>
          </div>

          <div v-if="selectedLog.stats">
            <div class="text-(--ui-text-dimmed) mb-1">Статистика</div>
            <pre
              class="bg-(--ui-bg-elevated) rounded-lg p-3 text-xs overflow-auto"
            >{{ JSON.stringify(selectedLog.stats, null, 2) }}</pre>
          </div>

          <div v-if="selectedLog.error">
            <div class="text-(--ui-text-dimmed) mb-1">Ошибка</div>
            <div class="text-red-500">{{ selectedLog.error }}</div>
          </div>

          <div v-if="selectedLog.errorStack">
            <div class="text-(--ui-text-dimmed) mb-1">Stack trace</div>
            <pre
              class="bg-(--ui-bg-elevated) rounded-lg p-3 text-xs overflow-auto max-h-80"
            >{{ selectedLog.errorStack }}</pre>
          </div>
        </div>
      </template>
    </UModal>
  </PageContainer>
</template>
