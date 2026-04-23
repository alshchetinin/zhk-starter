<script setup lang="ts">
import { useQuery, useMutation } from "@tanstack/vue-query";

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

// Reset kind-specific data when kind changes
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
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/purchase-methods">
          <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
        </NuxtLink>
        <h1 class="text-2xl font-bold">Новый способ покупки</h1>
      </div>
      <UButton
        icon="i-tabler-device-floppy"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
        :loading="createMutation.isPending.value"
        :disabled="!form.title"
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
          <UFormField label="Тип">
            <USelect
              v-model="form.kind"
              :items="purchaseMethodKindOptions"
              size="lg"
            />
          </UFormField>

          <UFormField label="Заголовок">
            <UInput
              v-model="form.title"
              placeholder="Например, Рассрочка 0% на 12 месяцев"
              size="lg"
            />
          </UFormField>

          <UFormField label="Описание">
            <UTextarea
              v-model="form.description"
              placeholder="Короткое описание для карточки..."
              :rows="3"
            />
          </UFormField>
        </div>

        <div
          class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
        >
          <h3 class="text-sm font-semibold">
            Параметры типа «{{ purchaseMethodKindLabels[form.kind] }}»
          </h3>
          <PurchaseMethodDataFields v-model="form.data" :kind="form.kind" />
        </div>

        <div
          class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
        >
          <h3 class="text-sm font-semibold">Доступен для проектов</h3>
          <p class="text-xs text-(--ui-text-muted)">
            Если не выбран ни один — способ действует для всех проектов.
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
          <UFormField label="Активен">
            <USwitch v-model="form.isActive" />
          </UFormField>

          <UFormField label="Порядок" hint="Меньше — выше в списке">
            <UInput v-model.number="form.sortOrder" type="number" />
          </UFormField>

          <UFormField label="Иконка" :hint="`По умолчанию: ${defaultIconForKind}`">
            <UInput v-model="form.icon" :placeholder="defaultIconForKind" />
          </UFormField>
        </div>
      </div>
    </div>
  </PageContainer>
</template>
