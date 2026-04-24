<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data: current, isPending } = useQuery(
  $orpc.dev.integrationProvider.get.queryOptions(),
);

const { data: integration } = useQuery($orpc.integration.get.queryOptions());

const selected = ref<"macro" | "profitbase">("macro");

watch(
  current,
  (v) => {
    if (v) selected.value = v.provider;
  },
  { immediate: true },
);

const providerOptions = [
  { value: "macro", label: "MacroCRM" },
  { value: "profitbase", label: "Profitbase" },
];

const isDirty = computed(() => selected.value !== current.value?.provider);

const hasConflict = computed(
  () =>
    !!integration.value &&
    !!integration.value.type &&
    integration.value.type !== selected.value,
);

const showConfirm = ref(false);

const setMutation = useMutation({
  mutationFn: (force: boolean) =>
    $orpcClient.dev.integrationProvider.set({
      provider: selected.value,
      force,
    }),
  onSuccess: () => {
    toast.add({
      title: "Провайдер изменён",
      description: "Сервер перезапустится автоматически",
      color: "success",
    });
    queryClient.invalidateQueries({ queryKey: $orpc.dev.integrationProvider.key() });
    queryClient.invalidateQueries({ queryKey: $orpc.integration.key() });
    showConfirm.value = false;
  },
  onError: (err: unknown) => {
    const msg = err instanceof Error ? err.message : "Ошибка";
    toast.add({ title: "Не удалось сменить", description: msg, color: "error" });
  },
});

function apply() {
  if (hasConflict.value) {
    showConfirm.value = true;
    return;
  }
  setMutation.mutate(false);
}
</script>

<template>
  <PageContainer>
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">
        Интеграция стартера
      </h1>
      <p class="text-(--ui-text-muted) text-sm mt-1">
        Dev-only: выбор провайдера CRM для этого стартера. Клиент видит только
        выбранный вариант.
      </p>
    </div>

    <div v-if="isPending" class="flex justify-center py-20">
      <UIcon name="i-tabler-loader-2" class="animate-spin text-3xl" />
    </div>

    <template v-else>
      <div class="max-w-2xl space-y-6">
        <div class="rounded-xl border border-(--ui-border) p-6 space-y-5">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium text-(--ui-text-highlighted)">
                Активный провайдер
              </div>
              <div class="text-sm text-(--ui-text-muted)">
                Текущее значение из <code>INTEGRATION_PROVIDER</code>
              </div>
            </div>
            <UBadge variant="subtle" color="neutral">
              {{ current?.provider }}
            </UBadge>
          </div>

          <UFormField label="Новый провайдер">
            <USelect
              v-model="selected"
              :items="providerOptions"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <div
            v-if="hasConflict"
            class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-4 text-sm"
          >
            <div class="flex gap-2">
              <UIcon
                name="i-tabler-alert-triangle"
                class="text-amber-600 dark:text-amber-400 text-lg shrink-0"
              />
              <div class="text-amber-900 dark:text-amber-200">
                Уже настроена интеграция типа
                <code>{{ integration?.type }}</code
                >. При смене провайдера её запись и импортированные проекты
                останутся в БД, но sync для неё остановится. Настройте нового
                провайдера заново после смены.
              </div>
            </div>
          </div>

          <div class="flex justify-end">
            <UButton
              :disabled="!isDirty"
              :loading="setMutation.isPending.value"
              icon="i-tabler-device-floppy"
              class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl transition-colors"
              @click="apply"
            >
              Применить
            </UButton>
          </div>
        </div>
      </div>

      <UModal v-model:open="showConfirm" title="Удалить существующую интеграцию?">
        <template #body>
          <p class="text-sm text-(--ui-text-muted)">
            Интеграция <code>{{ integration?.type }}</code> будет удалена из
            БД, чтобы провайдер переключился на <code>{{ selected }}</code>.
            Импортированные ранее проекты/квартиры останутся, но sync для них
            работать не будет.
          </p>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              variant="outline"
              class="rounded-xl"
              @click="showConfirm = false"
            >
              Отмена
            </UButton>
            <UButton
              color="error"
              :loading="setMutation.isPending.value"
              class="rounded-xl"
              @click="setMutation.mutate(true)"
            >
              Удалить и сменить
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </PageContainer>
</template>
