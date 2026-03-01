<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const modelValue = defineModel<boolean>("open", { required: true });

const emit = defineEmits<{
  created: [];
}>();

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

// Check if company has active integration
const { data: integration } = useQuery(
  $orpc.integration.get.queryOptions(),
);

const hasIntegration = computed(
  () => integration.value != null && integration.value.isActive,
);

// Step management
const step = ref(1);

// Step 1: name
const projectName = ref("");

// Step 2: MacroCRM — fetch complexes
const loadingComplexes = ref(false);

type MacroComplex = {
  id: number;
  name: string;
  houses: { id: number; name: string }[];
};

const complexes = ref<MacroComplex[]>([]);
const integrationId = ref<string | null>(null);
const selectedComplexId = ref<number | undefined>();

const selectedComplex = computed(() =>
  complexes.value.find((c) => c.id === selectedComplexId.value),
);

const complexOptions = computed(() =>
  complexes.value.map((c) => ({
    value: c.id,
    label: c.name,
  })),
);

// Validation
const canGoToStep2 = computed(() => projectName.value.trim().length > 0);

const canSubmit = computed(() => selectedComplexId.value !== undefined);

// Load complexes from integration
async function loadComplexes() {
  loadingComplexes.value = true;
  try {
    const result = await $orpcClient.integration.getComplexes();
    complexes.value = result.complexes ?? [];
    integrationId.value = result.integrationId;

    if (complexes.value.length === 0) {
      toast.add({ title: "Комплексы не найдены", color: "warning" });
    }
  } catch (error: any) {
    toast.add({
      title: "Ошибка загрузки комплексов",
      description: error.message,
      color: "error",
    });
  } finally {
    loadingComplexes.value = false;
  }
}

// Create mutation
const createMutation = useMutation({
  mutationFn: () =>
    $orpcClient.projects.create({
      name: projectName.value.trim(),
      integrationId: integrationId.value!,
      complexId: selectedComplexId.value!,
      complexName: selectedComplex.value?.name,
    }),
  onSuccess: () => {
    toast.add({ title: "Проект создан", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.projects.key() });
    emit("created");
    closeAndReset();
  },
});

// Navigation
function goToStep2() {
  if (!canGoToStep2.value) return;
  step.value = 2;

  if (complexes.value.length === 0) {
    loadComplexes();
  }
}

function goBack() {
  step.value = 1;
}

function closeAndReset() {
  modelValue.value = false;
  step.value = 1;
  projectName.value = "";
  complexes.value = [];
  integrationId.value = null;
  selectedComplexId.value = undefined;
}

function onSubmit() {
  createMutation.mutate();
}

const modalTitle = computed(() =>
  step.value === 1 ? "Новый проект" : "Выбор комплекса",
);
</script>

<template>
  <UModal v-model:open="modelValue" :title="modalTitle">
    <template #body>
      <!-- Step 1: Name -->
      <div v-if="step === 1" class="space-y-4">
        <UFormField label="Название проекта">
          <UInput
            v-model="projectName"
            placeholder="Например: ЖК Солнечный"
            icon="i-tabler-building"
            size="xl"
            class="w-full"
          />
        </UFormField>

        <div
          v-if="!hasIntegration"
          class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3"
        >
          <div class="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <UIcon name="i-tabler-alert-triangle" class="shrink-0" />
            <span>Сначала подключите MacroCRM в настройках интеграций</span>
          </div>
        </div>
      </div>

      <!-- Step 2: Select complex -->
      <div v-else-if="step === 2" class="space-y-4">
        <div v-if="loadingComplexes" class="flex justify-center py-8">
          <UIcon name="i-tabler-loader-2" class="animate-spin text-2xl" />
        </div>

        <template v-else-if="complexes.length > 0">
          <UFormField label="Жилой комплекс">
            <USelect
              v-model="selectedComplexId"
              :items="complexOptions"
              placeholder="Выберите комплекс"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <!-- Houses in complex -->
          <div
            v-if="selectedComplex && selectedComplex.houses.length > 0"
            class="text-xs text-(--ui-text-dimmed) space-y-1"
          >
            <div class="font-medium text-(--ui-text-muted)">
              Дома в составе ({{ selectedComplex.houses.length }}):
            </div>
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="house in selectedComplex.houses"
                :key="house.id"
                variant="subtle"
                color="neutral"
                size="xs"
              >
                {{ house.name }}
              </UBadge>
            </div>
            <p class="text-(--ui-text-dimmed) mt-1">
              Все лоты комплекса будут загружены при синхронизации
            </p>
          </div>
        </template>

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
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          variant="outline"
          class="rounded-xl"
          @click="step === 1 ? closeAndReset() : goBack()"
        >
          {{ step === 1 ? "Отмена" : "Назад" }}
        </UButton>

        <UButton
          v-if="step === 1"
          :disabled="!canGoToStep2 || !hasIntegration"
          class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl transition-colors"
          @click="goToStep2"
        >
          Далее
        </UButton>

        <UButton
          v-else
          :disabled="!canSubmit"
          :loading="createMutation.isPending.value"
          class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl transition-colors"
          @click="onSubmit"
        >
          Создать проект
        </UButton>
      </div>
    </template>
  </UModal>
</template>
