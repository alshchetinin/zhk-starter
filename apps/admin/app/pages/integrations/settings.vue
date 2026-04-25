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
  if (s === "success") return { color: "success" as const, label: "Готово" };
  if (s === "failed") return { color: "error" as const, label: "Ошибка" };
  if (s === "loading") return { color: "warning" as const, label: "Идёт синхронизация" };
  return { color: "neutral" as const, label: "Ожидание" };
});

const isPaused = computed(() => {
  const p = integration.value?.pausedUntil;
  return p && new Date(p) > new Date();
});
</script>

<template>
  <PageContainer>
    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-tabler-loader-2" class="animate-spin text-3xl" />
    </div>

    <template v-else-if="integration">
      <div class="mb-6 flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">
            Настройки синхронизации
          </h1>
          <p class="text-(--ui-text-muted) text-sm mt-1">
            Автоматические обновления и история запусков
          </p>
        </div>
        <UButton
          variant="outline"
          icon="i-tabler-history"
          class="rounded-md"
          to="/integrations/logs"
        >
          Логи
        </UButton>
      </div>

      <div class="max-w-2xl space-y-6">
        <!-- Статус -->
        <div class="border border-(--ui-border) p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div class="font-medium text-(--ui-text-highlighted)">Статус</div>
            <UBadge :color="statusBadge.color" variant="subtle">
              {{ statusBadge.label }}
            </UBadge>
          </div>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-(--ui-text-dimmed)">Последняя синхронизация</div>
              <div class="text-(--ui-text-highlighted)">
                {{ fmtDate(integration.lastSyncAt) }}
              </div>
            </div>
            <div>
              <div class="text-(--ui-text-dimmed)">Длительность</div>
              <div class="text-(--ui-text-highlighted)">
                {{ fmtDuration(integration.lastSyncDurationMs) }}
              </div>
            </div>
            <div>
              <div class="text-(--ui-text-dimmed)">Следующий запуск</div>
              <div class="text-(--ui-text-highlighted)">
                {{ isPaused ? "На паузе" : fmtDate(integration.nextSyncAt) }}
              </div>
            </div>
            <div v-if="isPaused">
              <div class="text-(--ui-text-dimmed)">Пауза до</div>
              <div class="text-(--ui-text-highlighted)">
                {{ fmtDate(integration.pausedUntil) }}
              </div>
            </div>
          </div>
          <div class="flex gap-2 pt-3 border-t border-(--ui-border)">
            <UButton
              :loading="triggerMutation.isPending.value"
              :disabled="integration.status === 'loading'"
              icon="i-tabler-refresh"
              variant="outline"
              class="rounded-md"
              @click="triggerMutation.mutate()"
            >
              Запустить сейчас
            </UButton>
            <UButton
              v-if="integration.status === 'loading'"
              :loading="cancelMutation.isPending.value"
              icon="i-tabler-player-stop"
              color="warning"
              variant="outline"
              class="rounded-md"
              @click="cancelMutation.mutate()"
            >
              Отменить
            </UButton>
          </div>
        </div>

        <!-- Автосинхронизация -->
        <div class="border border-(--ui-border) p-6 space-y-5">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium text-(--ui-text-highlighted)">
                Автоматическая синхронизация
              </div>
              <div class="text-sm text-(--ui-text-muted)">
                Запускать импорт по расписанию
              </div>
            </div>
            <USwitch v-model="form.autoSyncEnabled" />
          </div>

          <UFormField label="Интервал">
            <USelect
              v-model="form.syncIntervalMinutes"
              :items="intervalOptions"
              :disabled="!form.autoSyncEnabled"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UFormField
              label="Окно с часа"
              description="Синхронизировать только в указанные часы (опц.)"
            >
              <UInput
                v-model.number="form.syncWindowStart"
                type="number"
                min="0"
                max="23"
                placeholder="Любое"
                :disabled="!form.autoSyncEnabled"
                size="xl"
                class="w-full"
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
                size="xl"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <!-- Пауза -->
        <div class="border border-(--ui-border) p-6 space-y-4">
          <div>
            <div class="font-medium text-(--ui-text-highlighted)">Пауза</div>
            <div class="text-sm text-(--ui-text-muted)">
              Временно остановить автосинхронизацию
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              :loading="pauseMutation.isPending.value"
              variant="outline"
              class="rounded-md"
              @click="pauseMutation.mutate(1)"
            >
              На 1 час
            </UButton>
            <UButton
              :loading="pauseMutation.isPending.value"
              variant="outline"
              class="rounded-md"
              @click="pauseMutation.mutate(24)"
            >
              На 24 часа
            </UButton>
            <UButton
              :loading="pauseMutation.isPending.value"
              variant="outline"
              class="rounded-md"
              @click="pauseMutation.mutate(168)"
            >
              На неделю
            </UButton>
            <UButton
              v-if="isPaused"
              :loading="pauseMutation.isPending.value"
              variant="outline"
              color="success"
              class="rounded-md"
              @click="pauseMutation.mutate(null)"
            >
              Снять паузу
            </UButton>
          </div>
        </div>

        <!-- Ретраи -->
        <div class="border border-(--ui-border) p-6 space-y-4">
          <div>
            <div class="font-medium text-(--ui-text-highlighted)">
              Повторные попытки при ошибке
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Количество попыток">
              <UInput
                v-model.number="form.retryAttempts"
                type="number"
                min="0"
                max="10"
                size="xl"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Задержка (мин.)">
              <UInput
                v-model.number="form.retryDelayMinutes"
                type="number"
                min="1"
                max="1440"
                size="xl"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <!-- Хранение логов -->
        <div class="border border-(--ui-border) p-6 space-y-4">
          <div>
            <div class="font-medium text-(--ui-text-highlighted)">
              Хранение логов
            </div>
            <div class="text-sm text-(--ui-text-muted)">
              Старые записи автоматически удаляются раз в час
            </div>
          </div>
          <UFormField label="Хранить (дней)">
            <UInput
              v-model.number="form.logsRetentionDays"
              type="number"
              min="1"
              max="365"
              size="xl"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Уведомления -->
        <div class="border border-(--ui-border) p-6 space-y-5">
          <div>
            <div class="font-medium text-(--ui-text-highlighted)">
              Уведомления в Telegram
            </div>
            <div class="text-sm text-(--ui-text-muted)">
              Отдельный бот для сообщений о синхронизации
            </div>
          </div>

          <UFormField label="Что отправлять">
            <USelect
              v-model="form.notifyLevel"
              :items="[
                { value: 'none', label: 'Ничего' },
                { value: 'errors', label: 'Только ошибки' },
                { value: 'all', label: 'Все события (успех + ошибки)' },
              ]"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Bot Token"
            description="Создайте бота через @BotFather и вставьте токен"
          >
            <UInput
              v-model="form.notifyTelegramBotToken"
              type="password"
              placeholder="123456:ABC-DEF..."
              :disabled="form.notifyLevel === 'none'"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Chat ID"
            description="ID чата или канала, куда слать уведомления"
          >
            <UInput
              v-model="form.notifyTelegramChatId"
              placeholder="-1001234567890"
              :disabled="form.notifyLevel === 'none'"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <UButton
            variant="outline"
            icon="i-tabler-send"
            :loading="testNotifyMutation.isPending.value"
            :disabled="
              !integration.notifyTelegramBotToken ||
              !integration.notifyTelegramChatId
            "
            class="rounded-md"
            @click="testNotifyMutation.mutate()"
          >
            Отправить тестовое сообщение
          </UButton>
          <p
            v-if="
              !integration.notifyTelegramBotToken ||
              !integration.notifyTelegramChatId
            "
            class="text-xs text-(--ui-text-dimmed)"
          >
            Сохраните настройки, чтобы проверить отправку
          </p>
        </div>

        <div class="flex justify-end gap-2">
          <UButton
            :loading="updateMutation.isPending.value"
            icon="i-tabler-device-floppy"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) transition-colors"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </UButton>
        </div>
      </div>
    </template>

    <div v-else class="text-center py-20">
      <p class="text-(--ui-text-muted)">Интеграция не настроена</p>
      <UButton to="/integrations" variant="outline" class="mt-4">
        К настройке интеграции
      </UButton>
    </div>
  </PageContainer>
</template>
