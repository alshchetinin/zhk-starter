<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

// Fetch current integration
const { data: integration, isPending: loading } = useQuery(
  $orpc.integration.get.queryOptions(),
);

const hasIntegration = computed(
  () => integration.value != null && integration.value.isActive,
);

// Setup form
const domain = ref("");
const apiDomain = ref("api.macroserver.ru");
const appSecret = ref("");
const macroType = ref<"living" | "comm">("living");

const macroTypeOptions = [
  { value: "living", label: "Жилая недвижимость" },
  { value: "comm", label: "Коммерческая недвижимость" },
];

// Setup mutation
const setupMutation = useMutation({
  mutationFn: () =>
    $orpcClient.integration.setup({
      domain: domain.value.trim(),
      appSecret: appSecret.value.trim(),
      apiDomain: apiDomain.value.trim(),
      macroType: macroType.value,
    }),
  onSuccess: () => {
    toast.add({
      title: "Интеграция настроена",
      description: "MacroCRM успешно подключена",
      color: "success",
    });
    domain.value = "";
    appSecret.value = "";
    apiDomain.value = "api.macroserver.ru";
    queryClient.invalidateQueries({ queryKey: $orpc.integration.key() });
  },
});

// Verify mutation
const verifyMutation = useMutation({
  mutationFn: () => $orpcClient.integration.verifyConnection(),
  onSuccess: (result: any) => {
    toast.add({
      title: "Подключение активно",
      description: `Найдено комплексов: ${result.complexCount}`,
      color: "success",
    });
    queryClient.invalidateQueries({ queryKey: $orpc.integration.key() });
  },
});

// Remove mutation
const showRemoveConfirm = ref(false);

const removeMutation = useMutation({
  mutationFn: () => $orpcClient.integration.remove(),
  onSuccess: () => {
    toast.add({ title: "Интеграция отключена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.integration.key() });
    showRemoveConfirm.value = false;
  },
});

const canSetup = computed(
  () => domain.value.trim().length > 0 && appSecret.value.trim().length > 0,
);

function pluralize(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

// === Projects selection ===

const {
  data: complexesData,
  isPending: loadingComplexes,
} = useQuery(
  computed(() => ({
    ...$orpc.integration.getComplexes.queryOptions(),
    enabled: hasIntegration.value,
  })),
);

const complexes = computed(() => complexesData.value?.complexes ?? []);
const existingComplexIds = computed(
  () => new Set(complexesData.value?.existingComplexIds ?? []),
);
const integrationId = computed(() => complexesData.value?.integrationId ?? null);

const availableComplexes = computed(() =>
  complexes.value.filter((c) => !existingComplexIds.value.has(c.id)),
);

// Selected complex IDs (only non-existing ones)
const selectedIds = ref(new Set<number>());

const allSelected = computed(
  () =>
    availableComplexes.value.length > 0 &&
    availableComplexes.value.every((c) => selectedIds.value.has(c.id)),
);

const someSelected = computed(
  () =>
    availableComplexes.value.some((c) => selectedIds.value.has(c.id)) &&
    !allSelected.value,
);

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(availableComplexes.value.map((c) => c.id));
  }
}

function toggleComplex(id: number) {
  const next = new Set(selectedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  selectedIds.value = next;
}

const createBatchMutation = useMutation({
  mutationFn: () =>
    $orpcClient.projects.createBatch({
      integrationId: integrationId.value!,
      complexes: complexes.value
        .filter((c) => selectedIds.value.has(c.id))
        .map((c) => ({ complexId: c.id, complexName: c.name })),
    }),
  onSuccess: (created) => {
    toast.add({
      title: "Проекты добавлены",
      description: `Создано проектов: ${created.length}`,
      color: "success",
    });
    selectedIds.value = new Set();
    queryClient.invalidateQueries({
      queryKey: $orpc.integration.getComplexes.key(),
    });
    queryClient.invalidateQueries({ queryKey: $orpc.projects.key() });
  },
});
</script>

<template>
  <PageContainer>
    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-tabler-loader-2" class="animate-spin text-3xl" />
    </div>

    <template v-else>
      <div class="mb-6 flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">
            Интеграции
          </h1>
          <p class="text-(--ui-text-muted) text-sm mt-1">
            Настройка подключения к CRM-системам
          </p>
        </div>
        <div v-if="hasIntegration" class="flex gap-2">
          <UButton
            variant="outline"
            icon="i-tabler-settings"
            class="rounded-xl"
            to="/integrations/settings"
          >
            Синхронизация
          </UButton>
          <UButton
            variant="outline"
            icon="i-tabler-history"
            class="rounded-xl"
            to="/integrations/logs"
          >
            Логи
          </UButton>
        </div>
      </div>

      <div class="max-w-2xl space-y-6">
        <!-- Active integration -->
        <div
          v-if="hasIntegration"
          class="rounded-xl border border-(--ui-border) p-6 space-y-5"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center"
              >
                <UIcon
                  name="i-tabler-plug-connected"
                  class="text-blue-600 dark:text-blue-400 text-xl"
                />
              </div>
              <div>
                <div class="font-medium text-(--ui-text-highlighted)">
                  MacroCRM
                </div>
                <div class="text-sm text-(--ui-text-muted)">
                  {{ integration!.domain }}
                </div>
              </div>
            </div>
            <UBadge color="success" variant="subtle">Подключено</UBadge>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-(--ui-text-dimmed)">Тип объектов</div>
              <div class="text-(--ui-text-highlighted)">
                {{
                  integration!.macroType === "living"
                    ? "Жилая недвижимость"
                    : integration!.macroType === "comm"
                      ? "Коммерческая недвижимость"
                      : "Не указан"
                }}
              </div>
            </div>
            <div>
              <div class="text-(--ui-text-dimmed)">Последняя проверка</div>
              <div class="text-(--ui-text-highlighted)">
                {{
                  integration!.lastVerifiedAt
                    ? new Date(integration!.lastVerifiedAt).toLocaleString("ru-RU")
                    : "Не проверялось"
                }}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2 border-t border-(--ui-border)">
            <UButton
              variant="outline"
              icon="i-tabler-refresh"
              :loading="verifyMutation.isPending.value"
              class="rounded-xl"
              @click="verifyMutation.mutate()"
            >
              Проверить подключение
            </UButton>
            <UButton
              variant="outline"
              color="error"
              icon="i-tabler-plug-connected-x"
              class="rounded-xl ml-auto"
              @click="showRemoveConfirm = true"
            >
              Отключить
            </UButton>
          </div>
        </div>

        <!-- Projects selection -->
        <div
          v-if="hasIntegration"
          class="rounded-xl border border-(--ui-border) p-6 space-y-4"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium text-(--ui-text-highlighted)">
                Проекты
              </div>
              <div class="text-sm text-(--ui-text-muted)">
                Выберите комплексы для добавления
              </div>
            </div>
            <UBadge v-if="complexes.length > 0" variant="subtle" color="neutral">
              {{ complexes.length }}
            </UBadge>
          </div>

          <!-- Loading -->
          <div v-if="loadingComplexes" class="flex justify-center py-8">
            <UIcon name="i-tabler-loader-2" class="animate-spin text-2xl" />
          </div>

          <!-- Complex list -->
          <template v-else-if="complexes.length > 0">
            <!-- Select all -->
            <label
              v-if="availableComplexes.length > 0"
              class="flex items-center gap-3 py-2 px-3 rounded-lg bg-(--ui-bg-elevated) cursor-pointer"
            >
              <UCheckbox
                :model-value="allSelected"
                :indeterminate="someSelected"
                @update:model-value="toggleAll"
              />
              <span class="text-sm font-medium text-(--ui-text-highlighted)">
                Выбрать все
              </span>
              <UBadge variant="subtle" color="neutral" size="xs" class="ml-auto">
                {{ availableComplexes.length }} доступно
              </UBadge>
            </label>

            <!-- Complex items -->
            <div class="space-y-1">
              <label
                v-for="complex in complexes"
                :key="complex.id"
                class="flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors"
                :class="
                  existingComplexIds.has(complex.id)
                    ? 'opacity-60'
                    : 'hover:bg-(--ui-bg-elevated) cursor-pointer'
                "
              >
                <UCheckbox
                  :model-value="
                    existingComplexIds.has(complex.id) ||
                    selectedIds.has(complex.id)
                  "
                  :disabled="existingComplexIds.has(complex.id)"
                  @update:model-value="toggleComplex(complex.id)"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-sm text-(--ui-text-highlighted) truncate">
                    {{ complex.name }}
                  </div>
                  <div
                    v-if="complex.houses?.length"
                    class="text-xs text-(--ui-text-dimmed)"
                  >
                    {{ complex.houses.length }}
                    {{ pluralize(complex.houses.length, ['дом', 'дома', 'домов']) }}
                  </div>
                </div>
                <UBadge
                  v-if="existingComplexIds.has(complex.id)"
                  variant="subtle"
                  color="success"
                  size="xs"
                >
                  Добавлен
                </UBadge>
              </label>
            </div>

            <!-- Add button -->
            <div
              v-if="availableComplexes.length > 0"
              class="pt-3 border-t border-(--ui-border)"
            >
              <UButton
                :disabled="selectedIds.size === 0"
                :loading="createBatchMutation.isPending.value"
                icon="i-tabler-plus"
                class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl transition-colors"
                @click="createBatchMutation.mutate()"
              >
                Добавить выбранные ({{ selectedIds.size }})
              </UButton>
            </div>

            <!-- All added state -->
            <div
              v-if="availableComplexes.length === 0"
              class="text-center py-4"
            >
              <UIcon
                name="i-tabler-circle-check"
                class="text-2xl text-green-500 mb-1"
              />
              <p class="text-sm text-(--ui-text-muted)">
                Все комплексы добавлены
              </p>
            </div>
          </template>

          <!-- Empty state -->
          <div v-else class="text-center py-6">
            <UIcon
              name="i-tabler-building-off"
              class="text-3xl text-(--ui-text-dimmed) mb-2"
            />
            <p class="text-sm text-(--ui-text-muted)">Комплексы не найдены</p>
            <p class="text-xs text-(--ui-text-dimmed) mt-1">
              Проверьте настройки интеграции MacroCRM
            </p>
          </div>
        </div>

        <!-- Setup form -->
        <div
          v-if="!hasIntegration"
          class="rounded-xl border border-(--ui-border) p-6 space-y-5"
        >
          <div class="flex items-center gap-3 mb-2">
            <div
              class="w-10 h-10 rounded-lg bg-(--ui-bg-muted) flex items-center justify-center"
            >
              <UIcon
                name="i-tabler-plug"
                class="text-(--ui-text-dimmed) text-xl"
              />
            </div>
            <div>
              <div class="font-medium text-(--ui-text-highlighted)">
                MacroCRM
              </div>
              <div class="text-sm text-(--ui-text-muted)">
                Подключите CRM для импорта объектов
              </div>
            </div>
          </div>

          <UFormField label="Домен">
            <UInput
              v-model="domain"
              placeholder="yourcompany"
              icon="i-tabler-world"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <UFormField label="API домен">
            <UInput
              v-model="apiDomain"
              placeholder="api.macroserver.ru"
              icon="i-tabler-server"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <UFormField label="App Secret">
            <UInput
              v-model="appSecret"
              type="password"
              placeholder="Секретный ключ из настроек MacroCRM"
              icon="i-tabler-key"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Тип объектов">
            <USelect
              v-model="macroType"
              :items="macroTypeOptions"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <UButton
            :disabled="!canSetup"
            :loading="setupMutation.isPending.value"
            icon="i-tabler-plug-connected"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl transition-colors"
            @click="setupMutation.mutate()"
          >
            Подключить MacroCRM
          </UButton>
        </div>
      </div>

      <!-- Remove confirmation modal -->
      <UModal v-model:open="showRemoveConfirm" title="Отключить интеграцию?">
        <template #body>
          <p class="text-sm text-(--ui-text-muted)">
            Подключение к MacroCRM будет удалено. Существующие проекты,
            использующие эту интеграцию, не смогут синхронизироваться.
          </p>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              variant="outline"
              class="rounded-xl"
              @click="showRemoveConfirm = false"
            >
              Отмена
            </UButton>
            <UButton
              color="error"
              :loading="removeMutation.isPending.value"
              class="rounded-xl"
              @click="removeMutation.mutate()"
            >
              Отключить
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </PageContainer>
</template>
