<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const router = useRouter();

const form = reactive({
  kind: "installment" as PurchaseMethodKind,
  title: "",
  description: "",
  icon: "",
  sortOrder: 0,
  isActive: true,
  data: {} as Record<string, unknown>,
  projectIds: [] as string[],
});

const { data: projectsData } = useQuery(
  $orpc.projects.list.queryOptions({ input: { page: 1, pageSize: 100 } }),
);

const projectOptions = computed(() =>
  (projectsData.value?.data ?? []).map((p) => ({ label: p.name, value: p.id })),
);

watch(
  () => form.kind,
  () => {
    form.data = {};
    if (!form.icon) form.icon = "";
  },
);

const defaultIconForKind = computed(() => purchaseMethodKindIcons[form.kind]);

const createMutation = useMutation({
  mutationFn: () =>
    $orpcClient.purchaseMethods.create({
      kind: form.kind,
      title: form.title,
      description: form.description || undefined,
      icon: form.icon || undefined,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      data: form.data,
      projectIds: form.projectIds.length ? form.projectIds : undefined,
    }),
  onSuccess: () => {
    toast.add({ title: "Способ создан", color: "success" });
    router.push("/purchase-methods");
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Новый способ покупки"
      back="/purchase-methods"
      :crumbs="[
        { label: 'Способы покупки', to: '/purchase-methods' },
        { label: 'Новый' },
      ]"
    >
      <template #actions>
        <UButton
          color="primary"
          icon="i-tabler-device-floppy"
          :loading="createMutation.isPending.value"
          :disabled="!form.title"
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
            <UFormField label="Тип">
              <USelect
                v-model="form.kind"
                :items="purchaseMethodKindOptions"
                size="sm"
              />
            </UFormField>
            <UFormField label="Заголовок">
              <UInput
                v-model="form.title"
                placeholder="Рассрочка 0% на 12 месяцев"
                size="sm"
              />
            </UFormField>
            <UFormField label="Описание">
              <UTextarea
                v-model="form.description"
                placeholder="Короткое описание для карточки…"
                :rows="3"
              />
            </UFormField>
          </div>
        </AppDataCard>

        <AppDataCard
          :title="`Параметры · ${purchaseMethodKindLabels[form.kind]}`"
        >
          <PurchaseMethodDataFields v-model="form.data" :kind="form.kind" />
        </AppDataCard>

        <AppDataCard title="Доступен для проектов">
          <p class="text-xs text-(--ui-text-dimmed) mb-2">
            Если не выбран ни один — способ действует для всех проектов.
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
            <UFormField label="Активен">
              <USwitch v-model="form.isActive" />
            </UFormField>
            <UFormField label="Порядок" hint="Меньше — выше в списке">
              <UInput
                v-model.number="form.sortOrder"
                type="number"
                size="sm"
              />
            </UFormField>
            <UFormField
              label="Иконка"
              :hint="`По умолчанию: ${defaultIconForKind}`"
            >
              <UInput
                v-model="form.icon"
                :placeholder="defaultIconForKind"
                size="sm"
              />
            </UFormField>
          </div>
        </AppDataCard>
      </div>
    </div>
  </PageContainer>
</template>
