<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data: integration, isPending: loading } = useQuery(
  $orpc.integration.get.queryOptions(),
);

const form = reactive({
  autoSyncEnabled: false,
  syncIntervalMinutes: 60,
  syncWindowStart: null as number | null,
  syncWindowEnd: null as number | null,
  retryAttempts: 3,
  retryDelayMinutes: 5,
  logsRetentionDays: 30,
  notifyLevel: "errors" as "none" | "errors" | "all",
  notifyTelegramBotToken: "",
  notifyTelegramChatId: "",
});

watch(
  integration,
  (i) => {
    if (!i) return;
    form.autoSyncEnabled = i.autoSyncEnabled;
    form.syncIntervalMinutes = i.syncIntervalMinutes;
    form.syncWindowStart = i.syncWindowStart;
    form.syncWindowEnd = i.syncWindowEnd;
    form.retryAttempts = i.retryAttempts;
    form.retryDelayMinutes = i.retryDelayMinutes;
    form.logsRetentionDays = i.logsRetentionDays;
    form.notifyLevel = (i.notifyLevel as typeof form.notifyLevel) ?? "errors";
    form.notifyTelegramBotToken = i.notifyTelegramBotToken ?? "";
    form.notifyTelegramChatId = i.notifyTelegramChatId ?? "";
  },
  { immediate: true },
);

const intervalOptions = [
  { value: 15, label: "Каждые 15 минут" },
  { value: 30, label: "Каждые 30 минут" },
  { value: 60, label: "Раз в час" },
  { value: 180, label: "Раз в 3 часа" },
  { value: 360, label: "Раз в 6 часов" },
  { value: 720, label: "Раз в 12 часов" },
  { value: 1440, label: "Раз в сутки" },
];

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.integration.updateSyncSettings({
      integrationId: integration.value!.id,
      autoSyncEnabled: form.autoSyncEnabled,
      syncIntervalMinutes: form.syncIntervalMinutes,
      syncWindowStart: form.syncWindowStart,
      syncWindowEnd: form.syncWindowEnd,
      retryAttempts: form.retryAttempts,
      retryDelayMinutes: form.retryDelayMinutes,
      logsRetentionDays: form.logsRetentionDays,
      notifyLevel: form.notifyLevel,
      notifyTelegramBotToken: form.notifyTelegramBotToken.trim() || null,
      notifyTelegramChatId: form.notifyTelegramChatId.trim() || null,
    }),
  onSuccess: () => {
    toast.add({ title: "Настройки сохранены", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.integration.key() });
  },
});

const pauseMutation = useMutation({
  mutationFn: (hours: number | null) =>
    $orpcClient.integration.pauseSync({
      integrationId: integration.value!.id,
      until: hours ? new Date(Date.now() + hours * 3600_000) : null,
    }),
  onSuccess: () => {
    toast.add({ title: "Пауза обновлена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.integration.key() });
  },
});

const cancelMutation = useMutation({
  mutationFn: () =>
    $orpcClient.integration.cancelRunningSync({
      integrationId: integration.value!.id,
    }),
  onSuccess: () => {
    toast.add({ title: "Запрошена отмена", color: "warning" });
    queryClient.invalidateQueries({ queryKey: $orpc.integration.key() });
  },
});

const testNotifyMutation = useMutation({
  mutationFn: () =>
    $orpcClient.integration.testNotification({
      integrationId: integration.value!.id,
    }),
  onSuccess: () => {
    toast.add({ title: "Тестовое сообщение отправлено", color: "success" });
  },
  onError: (err: unknown) => {
    const msg = err instanceof Error ? err.message : "Не удалось отправить";
    toast.add({ title: "Ошибка отправки", description: msg, color: "error" });
  },
});

const triggerMutation = useMutation({
  mutationFn: () =>
    $orpcClient.integration.triggerSync({
      integrationId: integration.value!.id,
      complexes: [],
    }),
  onSuccess: () => {
    toast.add({ title: "Синхронизация запущена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.integration.key() });
  },
});

const statusBadge = computed(() => {
  const s = integration.value?.status;
  if (s === "success") return { tone: "success" as const, label: "Готово" };
  if (s === "failed") return { tone: "error" as const, label: "Ошибка" };
  if (s === "loading")
    return { tone: "warning" as const, label: "Идёт синхронизация" };
  return { tone: "muted" as const, label: "Ожидание" };
});

const isPaused = computed(() => {
  const p = integration.value?.pausedUntil;
  return p && new Date(p) > new Date();
});
</script>

<template>
  <PageContainer>
    <div
      v-if="loading"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <template v-else-if="integration">
      <AppPageHeader
        title="Настройки синхронизации"
        subtitle="Автоматические обновления и история запусков"
        back="/integrations"
        :crumbs="[
          { label: 'Интеграции', to: '/integrations' },
          { label: 'Синхронизация' },
        ]"
      >
        <template #actions>
          <AppToolbarButton
            to="/integrations/logs"
            icon="i-tabler-history"
            variant="ghost"
          >
            Логи
          </AppToolbarButton>
        </template>
      </AppPageHeader>

      <div class="max-w-2xl space-y-3">
        <!-- Status -->
        <AppDataCard title="Статус">
          <template #actions>
            <AppStatusPill
              :tone="statusBadge.tone"
              :label="statusBadge.label"
              dot
              :pulse="integration.status === 'loading'"
            />
          </template>
          <div class="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                Последняя синхронизация
              </div>
              <div class="text-sm font-medium tabular-nums mt-0.5">
                {{ fmtDate(integration.lastSyncAt) }}
              </div>
            </div>
            <div>
              <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                Длительность
              </div>
              <div class="text-sm font-medium tabular-nums mt-0.5">
                {{ fmtDuration(integration.lastSyncDurationMs) }}
              </div>
            </div>
            <div>
              <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                Следующий запуск
              </div>
              <div class="text-sm font-medium tabular-nums mt-0.5">
                {{ isPaused ? "На паузе" : fmtDate(integration.nextSyncAt) }}
              </div>
            </div>
            <div v-if="isPaused">
              <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                Пауза до
              </div>
              <div class="text-sm font-medium tabular-nums mt-0.5">
                {{ fmtDate(integration.pausedUntil) }}
              </div>
            </div>
          </div>
          <div class="flex gap-2 mt-4 pt-4 border-t border-(--ui-border)">
            <AppToolbarButton
              variant="primary"
              icon="i-tabler-refresh"
              :loading="triggerMutation.isPending.value"
              :disabled="integration.status === 'loading'"
              @click="triggerMutation.mutate()"
            >
              Запустить сейчас
            </AppToolbarButton>
            <AppToolbarButton
              v-if="integration.status === 'loading'"
              variant="ghost"
              icon="i-tabler-player-stop"
              :loading="cancelMutation.isPending.value"
              @click="cancelMutation.mutate()"
            >
              Отменить
            </AppToolbarButton>
          </div>
        </AppDataCard>

        <!-- Auto-sync -->
        <AppDataCard>
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="text-sm font-semibold">Автоматическая синхронизация</div>
              <div class="text-xs text-(--ui-text-dimmed) mt-0.5">
                Запускать импорт по расписанию
              </div>
            </div>
            <USwitch v-model="form.autoSyncEnabled" />
          </div>

          <div class="space-y-3">
            <UFormField label="Интервал">
              <USelect
                v-model="form.syncIntervalMinutes"
                :items="intervalOptions"
                :disabled="!form.autoSyncEnabled"
                size="sm"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <UFormField
                label="Окно с часа"
                description="Синхронизировать только в указанные часы"
              >
                <UInput
                  v-model.number="form.syncWindowStart"
                  type="number"
                  min="0"
                  max="23"
                  placeholder="Любое"
                  :disabled="!form.autoSyncEnabled"
                  size="sm"
                />
              </UFormField>
              <UFormField label="до часа">
                <UInput
                  v-model.number="form.syncWindowEnd"
                  type="number"
                  min="0"
                  max="23"
                  placeholder="Любое"
                  :disabled="!form.autoSyncEnabled"
                  size="sm"
                />
              </UFormField>
            </div>
          </div>
        </AppDataCard>

        <!-- Pause -->
        <AppDataCard title="Пауза">
          <p class="text-xs text-(--ui-text-dimmed) mb-3">
            Временно остановить автосинхронизацию
          </p>
          <div class="flex flex-wrap gap-1.5">
            <AppToolbarButton
              variant="ghost"
              :loading="pauseMutation.isPending.value"
              @click="pauseMutation.mutate(1)"
            >
              На 1 час
            </AppToolbarButton>
            <AppToolbarButton
              variant="ghost"
              :loading="pauseMutation.isPending.value"
              @click="pauseMutation.mutate(24)"
            >
              На 24 часа
            </AppToolbarButton>
            <AppToolbarButton
              variant="ghost"
              :loading="pauseMutation.isPending.value"
              @click="pauseMutation.mutate(168)"
            >
              На неделю
            </AppToolbarButton>
            <AppToolbarButton
              v-if="isPaused"
              variant="primary"
              icon="i-tabler-player-play"
              :loading="pauseMutation.isPending.value"
              @click="pauseMutation.mutate(null)"
            >
              Снять паузу
            </AppToolbarButton>
          </div>
        </AppDataCard>

        <!-- Retries -->
        <AppDataCard title="Повторные попытки при ошибке">
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Количество попыток">
              <UInput
                v-model.number="form.retryAttempts"
                type="number"
                min="0"
                max="10"
                size="sm"
              />
            </UFormField>
            <UFormField label="Задержка (мин.)">
              <UInput
                v-model.number="form.retryDelayMinutes"
                type="number"
                min="1"
                max="1440"
                size="sm"
              />
            </UFormField>
          </div>
        </AppDataCard>

        <!-- Logs retention -->
        <AppDataCard title="Хранение логов">
          <p class="text-xs text-(--ui-text-dimmed) mb-3">
            Старые записи автоматически удаляются раз в час
          </p>
          <UFormField label="Хранить (дней)">
            <UInput
              v-model.number="form.logsRetentionDays"
              type="number"
              min="1"
              max="365"
              size="sm"
            />
          </UFormField>
        </AppDataCard>

        <!-- Notifications -->
        <AppDataCard title="Уведомления в Telegram">
          <p class="text-xs text-(--ui-text-dimmed) mb-4">
            Отдельный бот для сообщений о синхронизации
          </p>

          <div class="space-y-3">
            <UFormField label="Что отправлять">
              <USelect
                v-model="form.notifyLevel"
                :items="[
                  { value: 'none', label: 'Ничего' },
                  { value: 'errors', label: 'Только ошибки' },
                  { value: 'all', label: 'Все события (успех + ошибки)' },
                ]"
                size="sm"
              />
            </UFormField>

            <UFormField
              label="Bot Token"
              description="Создайте бота через @BotFather"
            >
              <UInput
                v-model="form.notifyTelegramBotToken"
                type="password"
                placeholder="123456:ABC-DEF..."
                :disabled="form.notifyLevel === 'none'"
                size="sm"
              />
            </UFormField>

            <UFormField
              label="Chat ID"
              description="ID чата или канала"
            >
              <UInput
                v-model="form.notifyTelegramChatId"
                placeholder="-1001234567890"
                :disabled="form.notifyLevel === 'none'"
                size="sm"
              />
            </UFormField>

            <AppToolbarButton
              variant="ghost"
              icon="i-tabler-send"
              :loading="testNotifyMutation.isPending.value"
              :disabled="
                !integration.notifyTelegramBotToken ||
                !integration.notifyTelegramChatId
              "
              @click="testNotifyMutation.mutate()"
            >
              Отправить тестовое сообщение
            </AppToolbarButton>
            <p
              v-if="
                !integration.notifyTelegramBotToken ||
                !integration.notifyTelegramChatId
              "
              class="text-[11px] text-(--ui-text-dimmed)"
            >
              Сохраните настройки, чтобы проверить отправку
            </p>
          </div>
        </AppDataCard>

        <div class="flex justify-end pt-1">
          <AppToolbarButton
            variant="primary"
            icon="i-tabler-device-floppy"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </AppToolbarButton>
        </div>
      </div>
    </template>

    <AppEmptyState
      v-else
      icon="i-tabler-plug-off"
      title="Интеграция не настроена"
      description="Подключите CRM, чтобы настроить расписание синхронизации."
    >
      <template #actions>
        <AppToolbarButton
          to="/integrations"
          icon="i-tabler-plug-connected"
          variant="primary"
        >
          К настройке интеграции
        </AppToolbarButton>
      </template>
    </AppEmptyState>
  </PageContainer>
</template>
