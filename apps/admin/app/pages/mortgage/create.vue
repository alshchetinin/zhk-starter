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
    <AppPageHeader
      title="Новая ипотечная программа"
      back="/mortgage"
      :crumbs="[
        { label: 'Ипотека', to: '/mortgage' },
        { label: 'Новая программа' },
      ]"
    >
      <template #actions>
        <UButton
          color="primary"
          icon="i-tabler-device-floppy"
          :loading="createMutation.isPending.value"
          :disabled="!form.name || !form.rate"
          @click="createMutation.mutate()"
        >
          Сохранить
        </UButton>
      </template>
    </AppPageHeader>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div class="lg:col-span-2 space-y-3">
        <AppDataCard title="Основные">
          <div class="space-y-3">
            <UFormField label="Название" required>
              <UInput
                v-model="form.name"
                placeholder="Например, Семейная ипотека 6%"
                size="sm"
              />
            </UFormField>
            <UFormField label="Описание">
              <UTextarea v-model="form.description" :rows="3" />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Ставка, %" hint="например 5.5">
                <UInput v-model="form.rate" placeholder="0.00" size="sm" />
              </UFormField>
              <UFormField label="Первый взнос от, %">
                <UInput
                  v-model="form.minDownPaymentPercent"
                  placeholder="0"
                  size="sm"
                />
              </UFormField>
              <UFormField label="Макс. сумма, ₽">
                <UInput
                  v-model="form.maxLoanAmount"
                  placeholder="12000000"
                  size="sm"
                />
              </UFormField>
              <UFormField label="Срок, мес.">
                <UInput
                  v-model.number="form.termMonths"
                  type="number"
                  placeholder="360"
                  size="sm"
                />
              </UFormField>
            </div>
          </div>
        </AppDataCard>

        <AppDataCard title="Доступна для проектов">
          <p class="text-xs text-(--ui-text-dimmed) mb-2">
            Если не выбран ни один — программа действует для всех проектов.
          </p>
          <USelectMenu
            v-model="form.projectIds"
            :items="projectOptions"
            value-key="value"
            multiple
            placeholder="Выберите проекты"
            size="sm"
            class="w-full"
          />
        </AppDataCard>
      </div>

      <div class="space-y-3">
        <AppDataCard title="Настройки">
          <div class="space-y-3">
            <UFormField label="Статус">
              <USelect
                v-model="form.status"
                :items="mortgageProgramStatusOptions"
                size="sm"
              />
            </UFormField>
            <UFormField label="Банк">
              <USelect v-model="form.bankId" :items="bankOptions" size="sm" />
            </UFormField>
          </div>
        </AppDataCard>
      </div>
    </div>
  </PageContainer>
</template>
