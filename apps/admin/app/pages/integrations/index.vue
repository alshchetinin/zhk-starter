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
</script>

<template>
  <PageContainer>
    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-tabler-loader-2" class="animate-spin text-3xl" />
    </div>

    <template v-else>
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">
          Интеграции
        </h1>
        <p class="text-(--ui-text-muted) text-sm mt-1">
          Настройка подключения к CRM-системам
        </p>
      </div>

      <div class="max-w-2xl">
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

        <!-- Setup form -->
        <div
          v-else
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
