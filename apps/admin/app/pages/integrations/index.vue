<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data: integration, isPending: loading } = useQuery(
  $orpc.integration.get.queryOptions(),
);

const { data: activeProvider } = useQuery(
  $orpc.integration.getActiveProvider.queryOptions(),
);

const providerLabel = computed(() =>
  activeProvider.value?.provider === "profitbase" ? "Profitbase" : "MacroCRM",
);

const hasIntegration = computed(
  () => integration.value != null && integration.value.isActive,
);

// MacroCRM setup
const domain = ref("");
const apiDomain = ref("api.macroserver.ru");
const appSecret = ref("");
const macroType = ref<"living" | "comm">("living");

const macroTypeOptions = [
  { value: "living", label: "Жилая недвижимость" },
  { value: "comm", label: "Коммерческая недвижимость" },
];

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

// Profitbase
const pbApiKey = ref("");
const pbAccountId = ref("");

const pbSetupMutation = useMutation({
  mutationFn: () =>
    $orpcClient.integration.setupProfitbase({
      apiKey: pbApiKey.value.trim(),
      accountId: pbAccountId.value.trim(),
    }),
  onSuccess: () => {
    toast.add({
      title: "Интеграция настроена",
      description: "Profitbase успешно подключена",
      color: "success",
    });
    pbApiKey.value = "";
    pbAccountId.value = "";
    queryClient.invalidateQueries({ queryKey: $orpc.integration.key() });
  },
});

const pbVerifyMutation = useMutation({
  mutationFn: () => $orpcClient.integration.verifyProfitbaseConnection(),
  onSuccess: (result: any) => {
    toast.add({
      title: "Подключение активно",
      description: `Найдено проектов: ${result.projectCount}`,
      color: "success",
    });
    queryClient.invalidateQueries({ queryKey: $orpc.integration.key() });
  },
});

const canSetupProfitbase = computed(
  () =>
    pbApiKey.value.trim().length > 0 && pbAccountId.value.trim().length > 0,
);

const { data: pbProjectsData, isPending: loadingPbProjects } = useQuery(
  computed(() => ({
    ...$orpc.integration.getProfitbaseProjects.queryOptions(),
    enabled:
      activeProvider.value?.provider === "profitbase" && hasIntegration.value,
  })),
);

const pbProjects = computed(() => pbProjectsData.value?.projects ?? []);
const pbExistingIds = computed(
  () => new Set(pbProjectsData.value?.existingProjectIds ?? []),
);
const pbIntegrationId = computed(
  () => pbProjectsData.value?.integrationId ?? null,
);
const pbSelectedIds = ref(new Set<number>());

const pbAvailable = computed(() =>
  pbProjects.value.filter((p) => !pbExistingIds.value.has(p.id)),
);

function togglePbProject(id: number) {
  const next = new Set(pbSelectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  pbSelectedIds.value = next;
}

const pbSyncMutation = useMutation({
  mutationFn: () =>
    $orpcClient.integration.triggerSync({
      integrationId: pbIntegrationId.value!,
      complexes: Array.from(pbSelectedIds.value),
    }),
  onSuccess: () => {
    toast.add({
      title: "Синхронизация запущена",
      description: `Импортируется ${pbSelectedIds.value.size} проектов`,
      color: "success",
    });
    pbSelectedIds.value = new Set();
    queryClient.invalidateQueries({ queryKey: $orpc.integration.key() });
  },
});

function pluralize(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

// MacroCRM complexes
const { data: complexesData, isPending: loadingComplexes } = useQuery(
  computed(() => ({
    ...$orpc.integration.getComplexes.queryOptions(),
    enabled:
      hasIntegration.value && activeProvider.value?.provider === "macro",
  })),
);

const complexes = computed(() => complexesData.value?.complexes ?? []);
const existingComplexIds = computed(
  () => new Set(complexesData.value?.existingComplexIds ?? []),
);
const integrationId = computed(
  () => complexesData.value?.integrationId ?? null,
);

const selectedIds = ref(new Set<number>());

const availableComplexes = computed(() =>
  complexes.value.filter((c) => !existingComplexIds.value.has(c.id)),
);

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
  if (next.has(id)) next.delete(id);
  else next.add(id);
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
    <div
      v-if="loading"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <template v-else>
      <AppPageHeader
        :title="`Интеграция · ${providerLabel}`"
        subtitle="Подключение к CRM-системе и импорт объектов"
      >
        <template #actions>
          <UButton
            v-if="hasIntegration"
            to="/integrations/settings"
            icon="i-tabler-settings"
            variant="outline"
          >
            Синхронизация
          </UButton>
          <UButton
            v-if="hasIntegration"
            to="/integrations/logs"
            icon="i-tabler-history"
            variant="outline"
          >
            Логи
          </UButton>
        </template>
      </AppPageHeader>

      <!-- ============== PROFITBASE ============== -->
      <div
        v-if="activeProvider?.provider === 'profitbase'"
        class="max-w-2xl space-y-3"
      >
        <!-- Active connection -->
        <AppDataCard v-if="hasIntegration">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="size-10 rounded-lg bg-indigo-500/10 flex items-center justify-center"
              >
                <UIcon
                  name="i-tabler-plug-connected"
                  class="size-5 text-indigo-600 dark:text-indigo-400"
                />
              </div>
              <div>
                <div class="text-sm font-semibold">Profitbase</div>
                <div class="text-xs text-(--ui-text-dimmed) font-mono">
                  pb{{ integration!.profitbaseAccountId }}.profitbase.ru
                </div>
              </div>
            </div>
            <AppStatusPill tone="success" label="Подключено" dot />
          </div>
          <div class="flex items-center gap-2 mt-4 pt-4 border-t border-(--ui-border)">
            <UButton
              variant="outline"
              icon="i-tabler-refresh"
              :loading="pbVerifyMutation.isPending.value"
              @click="pbVerifyMutation.mutate()"
            >
              Проверить
            </UButton>
            <UButton
              class="ml-auto"
              color="error"
              variant="outline"
              icon="i-tabler-plug-connected-x"
              @click="showRemoveConfirm = true"
            >
              Отключить
            </UButton>
          </div>
        </AppDataCard>

        <!-- Projects -->
        <AppDataCard v-if="hasIntegration" title="Проекты Profitbase">
          <template #actions>
            <span
              v-if="pbProjects.length"
              class="text-[11px] text-(--ui-text-dimmed) tabular-nums"
            >
              {{ pbProjects.length }}
            </span>
          </template>

          <div
            v-if="loadingPbProjects"
            class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-6 justify-center"
          >
            <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
            Загрузка…
          </div>

          <template v-else-if="pbProjects.length > 0">
            <div class="space-y-0.5">
              <label
                v-for="project in pbProjects"
                :key="project.id"
                class="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-(--ui-bg-elevated) cursor-pointer transition"
              >
                <UCheckbox
                  :model-value="
                    pbExistingIds.has(project.id) ||
                    pbSelectedIds.has(project.id)
                  "
                  :disabled="pbExistingIds.has(project.id)"
                  @update:model-value="togglePbProject(project.id)"
                />
                <span class="flex-1 min-w-0 text-sm truncate">
                  {{ project.title }}
                </span>
                <AppStatusPill
                  v-if="pbExistingIds.has(project.id)"
                  tone="success"
                  label="Синхронизирован"
                />
              </label>
            </div>

            <div
              v-if="pbAvailable.length"
              class="pt-3 mt-3 border-t border-(--ui-border)"
            >
              <UButton
                color="primary"
                icon="i-tabler-download"
                :disabled="pbSelectedIds.size === 0"
                :loading="pbSyncMutation.isPending.value"
                @click="pbSyncMutation.mutate()"
              >
                Импортировать выбранные ({{ pbSelectedIds.size }})
              </UButton>
            </div>
          </template>

          <AppEmptyState
            v-else
            compact
            icon="i-tabler-building-off"
            title="Проекты не найдены"
          />
        </AppDataCard>

        <!-- Setup -->
        <AppDataCard v-if="!hasIntegration">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="size-10 rounded-lg bg-(--ui-bg-elevated) flex items-center justify-center"
            >
              <UIcon
                name="i-tabler-plug"
                class="size-5 text-(--ui-text-dimmed)"
              />
            </div>
            <div>
              <div class="text-sm font-semibold">Profitbase</div>
              <div class="text-xs text-(--ui-text-dimmed)">
                Подключите Profitbase для импорта объектов
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <UFormField
              label="Account ID"
              description="Числовой ID из URL: pb{ID}.profitbase.ru"
            >
              <UInput
                v-model="pbAccountId"
                placeholder="1234"
                icon="i-tabler-hash"
                size="sm"
              />
            </UFormField>

            <UFormField
              label="API Key"
              description="Profitbase → Настройки → API"
            >
              <UInput
                v-model="pbApiKey"
                type="password"
                placeholder="pb_api_key…"
                icon="i-tabler-key"
                size="sm"
              />
            </UFormField>

            <UButton
              color="primary"
              icon="i-tabler-plug-connected"
              :disabled="!canSetupProfitbase"
              :loading="pbSetupMutation.isPending.value"
              @click="pbSetupMutation.mutate()"
            >
              Подключить Profitbase
            </UButton>
          </div>
        </AppDataCard>
      </div>

      <!-- ============== MACROCRM ============== -->
      <div v-else class="max-w-2xl space-y-3">
        <AppDataCard v-if="hasIntegration">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="size-10 rounded-lg bg-indigo-500/10 flex items-center justify-center"
              >
                <UIcon
                  name="i-tabler-plug-connected"
                  class="size-5 text-indigo-600 dark:text-indigo-400"
                />
              </div>
              <div>
                <div class="text-sm font-semibold">MacroCRM</div>
                <div class="text-xs text-(--ui-text-dimmed) font-mono">
                  {{ integration!.domain }}
                </div>
              </div>
            </div>
            <AppStatusPill tone="success" label="Подключено" dot />
          </div>

          <div class="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-(--ui-border) text-xs">
            <div>
              <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                Тип объектов
              </div>
              <div class="text-sm font-medium mt-0.5">
                {{
                  integration!.macroType === "living"
                    ? "Жилая"
                    : integration!.macroType === "comm"
                      ? "Коммерческая"
                      : "Не указан"
                }}
              </div>
            </div>
            <div>
              <div class="text-[11px] text-(--ui-text-dimmed) uppercase tracking-wider">
                Последняя проверка
              </div>
              <div class="text-sm font-medium mt-0.5 tabular-nums">
                {{
                  integration!.lastVerifiedAt
                    ? new Date(integration!.lastVerifiedAt).toLocaleString("ru-RU")
                    : "—"
                }}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 mt-4 pt-4 border-t border-(--ui-border)">
            <UButton
              variant="outline"
              icon="i-tabler-refresh"
              :loading="verifyMutation.isPending.value"
              @click="verifyMutation.mutate()"
            >
              Проверить
            </UButton>
            <UButton
              class="ml-auto"
              color="error"
              variant="outline"
              icon="i-tabler-plug-connected-x"
              @click="showRemoveConfirm = true"
            >
              Отключить
            </UButton>
          </div>
        </AppDataCard>

        <!-- Complexes -->
        <AppDataCard v-if="hasIntegration" title="Проекты">
          <template #actions>
            <span
              v-if="complexes.length > 0"
              class="text-[11px] text-(--ui-text-dimmed) tabular-nums"
            >
              {{ complexes.length }}
            </span>
          </template>

          <div
            v-if="loadingComplexes"
            class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-6 justify-center"
          >
            <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
            Загрузка…
          </div>

          <template v-else-if="complexes.length > 0">
            <label
              v-if="availableComplexes.length > 0"
              class="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md bg-(--ui-bg-elevated) cursor-pointer mb-1"
            >
              <UCheckbox
                :model-value="allSelected"
                :indeterminate="someSelected"
                @update:model-value="toggleAll"
              />
              <span class="text-xs font-medium">Выбрать все</span>
              <AppStatusPill
                tone="muted"
                :label="`${availableComplexes.length} доступно`"
                class="ml-auto"
              />
            </label>

            <div class="space-y-0.5">
              <label
                v-for="complex in complexes"
                :key="complex.id"
                class="flex items-center gap-3 py-2 px-2 -mx-2 rounded-md transition"
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
                  <div class="text-sm truncate">{{ complex.name }}</div>
                  <div
                    v-if="complex.houses?.length"
                    class="text-[11px] text-(--ui-text-dimmed) tabular-nums"
                  >
                    {{ complex.houses.length }}
                    {{ pluralize(complex.houses.length, ["дом", "дома", "домов"]) }}
                  </div>
                </div>
                <AppStatusPill
                  v-if="existingComplexIds.has(complex.id)"
                  tone="success"
                  label="Добавлен"
                />
              </label>
            </div>

            <div
              v-if="availableComplexes.length > 0"
              class="pt-3 mt-3 border-t border-(--ui-border)"
            >
              <UButton
                color="primary"
                icon="i-tabler-plus"
                :disabled="selectedIds.size === 0"
                :loading="createBatchMutation.isPending.value"
                @click="createBatchMutation.mutate()"
              >
                Добавить выбранные ({{ selectedIds.size }})
              </UButton>
            </div>

            <div
              v-if="availableComplexes.length === 0"
              class="text-center py-4"
            >
              <UIcon
                name="i-tabler-circle-check"
                class="size-6 text-emerald-500 mx-auto mb-1"
              />
              <p class="text-xs text-(--ui-text-muted)">
                Все комплексы добавлены
              </p>
            </div>
          </template>

          <AppEmptyState
            v-else
            compact
            icon="i-tabler-building-off"
            title="Комплексы не найдены"
            description="Проверьте настройки интеграции."
          />
        </AppDataCard>

        <!-- Setup form -->
        <AppDataCard v-if="!hasIntegration">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="size-10 rounded-lg bg-(--ui-bg-elevated) flex items-center justify-center"
            >
              <UIcon
                name="i-tabler-plug"
                class="size-5 text-(--ui-text-dimmed)"
              />
            </div>
            <div>
              <div class="text-sm font-semibold">MacroCRM</div>
              <div class="text-xs text-(--ui-text-dimmed)">
                Подключите CRM для импорта объектов
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <UFormField label="Домен">
              <UInput
                v-model="domain"
                placeholder="yourcompany"
                icon="i-tabler-world"
                size="sm"
              />
            </UFormField>
            <UFormField label="API домен">
              <UInput
                v-model="apiDomain"
                placeholder="api.macroserver.ru"
                icon="i-tabler-server"
                size="sm"
              />
            </UFormField>
            <UFormField label="App Secret">
              <UInput
                v-model="appSecret"
                type="password"
                placeholder="Секретный ключ"
                icon="i-tabler-key"
                size="sm"
              />
            </UFormField>
            <UFormField label="Тип объектов">
              <USelect v-model="macroType" :items="macroTypeOptions" size="sm" />
            </UFormField>

            <UButton
              color="primary"
              icon="i-tabler-plug-connected"
              :disabled="!canSetup"
              :loading="setupMutation.isPending.value"
              @click="setupMutation.mutate()"
            >
              Подключить MacroCRM
            </UButton>
          </div>
        </AppDataCard>
      </div>

      <UModal v-model:open="showRemoveConfirm" title="Отключить интеграцию?">
        <template #body>
          <p class="text-sm text-(--ui-text-muted)">
            Подключение будет удалено. Существующие проекты, использующие эту
            интеграцию, не смогут синхронизироваться.
          </p>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="outline" @click="showRemoveConfirm = false">
              Отмена
            </UButton>
            <UButton
            color="error"
            icon="i-tabler-plug-connected-x"
            :loading="removeMutation.isPending.value"
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
