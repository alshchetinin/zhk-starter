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

const statusTone = (s: string): "success" | "warning" | "error" | "muted" =>
  s === "success"
    ? "success"
    : s === "failed"
      ? "error"
      : s === "running"
        ? "warning"
        : "muted";

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
    <AppPageHeader
      title="Логи синхронизации"
      subtitle="История запусков импорта данных"
      back="/integrations"
      :crumbs="[
        { label: 'Интеграции', to: '/integrations' },
        { label: 'Логи' },
      ]"
    >
      <template #actions>
        <UButton
          to="/integrations/settings"
          icon="i-tabler-settings"
          variant="outline"
        >
          Настройки
        </UButton>
      </template>
    </AppPageHeader>

    <div class="mb-4 flex items-center gap-2">
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        size="sm"
        class="max-w-[200px]"
      />
      <span class="text-xs text-(--ui-text-dimmed) tabular-nums ml-auto">
        Всего: {{ total }}
      </span>
    </div>

    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <AppEmptyState
      v-else-if="items.length === 0"
      icon="i-tabler-history-off"
      title="Запусков ещё не было"
      description="Здесь появятся логи синхронизации с Profitbase / MacroCRM."
    />

    <AppDataCard v-else flush>
      <div
        class="grid grid-cols-[minmax(160px,1.5fr)_120px_140px_120px_minmax(0,1fr)] gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-(--ui-text-dimmed) border-b border-(--ui-border) font-medium"
      >
        <div>Старт</div>
        <div>Статус</div>
        <div>Триггер</div>
        <div>Длительность</div>
        <div>Статистика</div>
      </div>
      <div class="divide-y divide-(--ui-border)">
        <button
          v-for="log in items"
          :key="log.id"
          class="grid grid-cols-[minmax(160px,1.5fr)_120px_140px_120px_minmax(0,1fr)] gap-3 px-4 py-2.5 text-xs items-center text-left hover:bg-(--ui-bg-elevated) transition w-full"
          @click="selectedLogId = log.id"
        >
          <span class="truncate tabular-nums font-medium">
            {{ fmtDate(log.startedAt) }}
          </span>
          <AppStatusPill
            :tone="statusTone(log.status)"
            :label="statusLabel(log.status)"
            dot
            :pulse="log.status === 'running'"
          />
          <span class="text-(--ui-text-muted)">
            {{ triggerLabel(log.trigger) }}
          </span>
          <span class="tabular-nums text-(--ui-text-muted)">
            {{ fmtDuration(log.durationMs) }}
          </span>
          <span class="text-[11px] text-(--ui-text-dimmed) tabular-nums truncate">
            <template v-if="log.stats">
              +{{ log.stats.created ?? 0 }} / ~{{ log.stats.updated ?? 0 }}
            </template>
            <span v-else>—</span>
          </span>
        </button>
      </div>
    </AppDataCard>

    <div v-if="total > limit" class="mt-4 flex justify-center gap-2">
      <UButton
        variant="outline"
        :disabled="page === 0"
        @click="page = Math.max(0, page - 1)"
      >
        Назад
      </UButton>
      <UButton
        variant="outline"
        :disabled="(page + 1) * limit >= total"
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
        <div v-if="selectedLog" class="space-y-4 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider mb-1">
                Статус
              </div>
              <AppStatusPill
                :tone="statusTone(selectedLog.status)"
                :label="statusLabel(selectedLog.status)"
                dot
              />
            </div>
            <div>
              <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider mb-1">
                Триггер
              </div>
              <div class="text-sm font-medium">
                {{ triggerLabel(selectedLog.trigger) }}
              </div>
            </div>
            <div>
              <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider mb-1">
                Старт
              </div>
              <div class="text-sm font-medium tabular-nums">
                {{ fmtDate(selectedLog.startedAt) }}
              </div>
            </div>
            <div>
              <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider mb-1">
                Завершение
              </div>
              <div class="text-sm font-medium tabular-nums">
                {{ fmtDate(selectedLog.finishedAt) }}
              </div>
            </div>
            <div>
              <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider mb-1">
                Длительность
              </div>
              <div class="text-sm font-medium tabular-nums">
                {{ fmtDuration(selectedLog.durationMs) }}
              </div>
            </div>
          </div>

          <div v-if="selectedLog.stats">
            <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider mb-1">
              Статистика
            </div>
            <pre class="bg-(--ui-bg-elevated) rounded-md p-3 text-[11px] overflow-auto font-mono">{{ JSON.stringify(selectedLog.stats, null, 2) }}</pre>
          </div>

          <div v-if="selectedLog.error">
            <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider mb-1">
              Ошибка
            </div>
            <div class="text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 text-sm">
              {{ selectedLog.error }}
            </div>
          </div>

          <div v-if="selectedLog.errorStack">
            <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider mb-1">
              Stack trace
            </div>
            <pre class="bg-(--ui-bg-elevated) rounded-md p-3 text-[11px] overflow-auto max-h-80 font-mono">{{ selectedLog.errorStack }}</pre>
          </div>
        </div>
      </template>
    </UModal>
  </PageContainer>
</template>
