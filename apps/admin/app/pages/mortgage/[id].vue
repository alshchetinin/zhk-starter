<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data: program, isPending } = useQuery(
  computed(() =>
    $orpc.mortgagePrograms.getById.queryOptions({ input: { id: id.value } }),
  ),
);
const { data: banksData } = useQuery(
  $orpc.banks.list.queryOptions({ input: { page: 1, pageSize: 100 } }),
);
const { data: projectsData } = useQuery(
  $orpc.projects.list.queryOptions({ input: { page: 1, pageSize: 100 } }),
);

const bankOptions = computed(() =>
  (banksData.value?.data ?? []).map((b) => ({ label: b.name, value: b.id })),
);
const projectOptions = computed(() =>
  (projectsData.value?.data ?? []).map((p) => ({ label: p.name, value: p.id })),
);

const form = reactive({
  name: "",
  description: "",
  rate: "",
  maxLoanAmount: "",
  minDownPaymentPercent: "",
  termMonths: null as number | null,
  bankId: undefined as string | undefined,
  status: "active" as MortgageProgramStatus,
  projectIds: [] as string[],
});

whenever(
  program,
  (val) => {
    form.name = val.name;
    form.description = val.description ?? "";
    form.rate = val.rate ?? "";
    form.maxLoanAmount = val.maxLoanAmount ?? "";
    form.minDownPaymentPercent = val.minDownPaymentPercent ?? "";
    form.termMonths = val.termMonths ?? null;
    form.bankId = val.bankId ?? undefined;
    form.status = val.status;
    form.projectIds = val.programProjects?.map((pp) => pp.project.id) ?? [];
  },
  { once: true, immediate: true },
);

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.mortgagePrograms.update({
      id: id.value,
      name: form.name,
      description: form.description || null,
      rate: form.rate,
      maxLoanAmount: form.maxLoanAmount || null,
      minDownPaymentPercent: form.minDownPaymentPercent || null,
      termMonths: form.termMonths || null,
      bankId: form.bankId ?? null,
      status: form.status,
      projectIds: form.projectIds,
    }),
  onSuccess: () => {
    toast.add({ title: "Программа обновлена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.mortgagePrograms.key() });
  },
});

const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.mortgagePrograms.delete({ id: id.value }),
  onSuccess: () => {
    toast.add({ title: "Программа удалена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.mortgagePrograms.key() });
    router.push("/mortgage");
  },
});
</script>

<template>
  <PageContainer>
    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <template v-else-if="program">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/mortgage">
            <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
          </NuxtLink>
          <h1 class="text-2xl font-bold">{{ form.name || "Редактирование" }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            color="error"
            icon="i-tabler-trash"
            class="rounded-md"
            :loading="deleteMutation.isPending.value"
            @click="deleteMutation.mutate()"
          >
            Удалить
          </UButton>
          <UButton
            icon="i-tabler-device-floppy"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted)"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </UButton>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div class="lg:col-span-2 space-y-3">
          <div
            class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
          >
            <UFormField label="Название">
              <UInput v-model="form.name" size="lg" />
            </UFormField>

            <UFormField label="Описание">
              <UTextarea v-model="form.description" :rows="3" />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Ставка, %">
                <UInput v-model="form.rate" />
              </UFormField>
              <UFormField label="Первый взнос от, %">
                <UInput v-model="form.minDownPaymentPercent" />
              </UFormField>
              <UFormField label="Макс. сумма кредита, ₽">
                <UInput v-model="form.maxLoanAmount" />
              </UFormField>
              <UFormField label="Срок, мес.">
                <UInput v-model.number="form.termMonths" type="number" />
              </UFormField>
            </div>
          </div>

          <div
            class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
          >
            <h3 class="text-sm font-semibold">Доступна для проектов</h3>
            <p class="text-xs text-(--ui-text-muted)">
              Если не выбран ни один — программа действует для всех проектов.
            </p>
            <USelectMenu
              v-model="form.projectIds"
              :items="projectOptions"
              value-key="value"
              multiple
              placeholder="Выберите проекты"
            />
          </div>
        </div>

        <div class="space-y-3">
          <div
            class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
          >
            <UFormField label="Статус">
              <USelect v-model="form.status" :items="mortgageProgramStatusOptions" />
            </UFormField>

            <UFormField label="Банк">
              <USelect v-model="form.bankId" :items="bankOptions" />
            </UFormField>
          </div>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
