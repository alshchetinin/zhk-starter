<script setup lang="ts">
import { useQuery, useMutation } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const router = useRouter();

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

const createMutation = useMutation({
  mutationFn: () =>
    $orpcClient.mortgagePrograms.create({
      name: form.name,
      description: form.description || undefined,
      rate: form.rate,
      maxLoanAmount: form.maxLoanAmount || undefined,
      minDownPaymentPercent: form.minDownPaymentPercent || undefined,
      termMonths: form.termMonths || undefined,
      bankId: form.bankId,
      status: form.status,
      projectIds: form.projectIds.length ? form.projectIds : undefined,
    }),
  onSuccess: () => {
    toast.add({ title: "Программа создана", color: "success" });
    router.push("/mortgage");
  },
});
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/mortgage">
          <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
        </NuxtLink>
        <h1 class="text-2xl font-bold">Новая ипотечная программа</h1>
      </div>
      <UButton
        icon="i-tabler-device-floppy"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
        :loading="createMutation.isPending.value"
        :disabled="!form.name || !form.rate"
        @click="createMutation.mutate()"
      >
        Сохранить
      </UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div class="lg:col-span-2 space-y-3">
        <div
          class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
        >
          <UFormField label="Название">
            <UInput
              v-model="form.name"
              placeholder="Например, Семейная ипотека 6%"
              size="lg"
            />
          </UFormField>

          <UFormField label="Описание">
            <UTextarea v-model="form.description" :rows="3" />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Ставка, %" hint="например 5.5">
              <UInput v-model="form.rate" placeholder="0.00" />
            </UFormField>
            <UFormField label="Первый взнос от, %">
              <UInput v-model="form.minDownPaymentPercent" placeholder="0" />
            </UFormField>
            <UFormField label="Макс. сумма кредита, ₽">
              <UInput v-model="form.maxLoanAmount" placeholder="12000000" />
            </UFormField>
            <UFormField label="Срок, мес.">
              <UInput v-model.number="form.termMonths" type="number" placeholder="360" />
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
  </PageContainer>
</template>
