<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data: method, isPending } = useQuery(
  computed(() =>
    $orpc.purchaseMethods.getById.queryOptions({ input: { id: id.value } }),
  ),
);
const { data: projectsData } = useQuery(
  $orpc.projects.list.queryOptions({ input: { page: 1, pageSize: 100 } }),
);

const projectOptions = computed(() =>
  (projectsData.value?.data ?? []).map((p) => ({ label: p.name, value: p.id })),
);

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

whenever(
  method,
  (val) => {
    form.kind = val.kind as PurchaseMethodKind;
    form.title = val.title;
    form.description = val.description ?? "";
    form.icon = val.icon ?? "";
    form.sortOrder = val.sortOrder ?? 0;
    form.isActive = val.isActive ?? true;
    form.data = (val.data as Record<string, unknown>) ?? {};
    form.projectIds = val.methodProjects?.map((mp) => mp.project.id) ?? [];

    watch(
      () => form.kind,
      (next, prev) => {
        if (next !== prev) form.data = {};
      },
    );
  },
  { once: true, immediate: true },
);

const defaultIconForKind = computed(() => purchaseMethodKindIcons[form.kind]);

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.purchaseMethods.update({
      id: id.value,
      kind: form.kind,
      title: form.title,
      description: form.description || null,
      icon: form.icon || null,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      data: form.data,
      projectIds: form.projectIds,
    }),
  onSuccess: () => {
    toast.add({ title: "Способ обновлён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.purchaseMethods.key() });
  },
});

const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.purchaseMethods.delete({ id: id.value }),
  onSuccess: () => {
    toast.add({ title: "Способ удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.purchaseMethods.key() });
    router.push("/purchase-methods");
  },
});
</script>

<template>
  <PageContainer>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <template v-else-if="method">
      <AppPageHeader
        :title="form.title || 'Редактирование'"
        back="/purchase-methods"
        :crumbs="[
          { label: 'Способы покупки', to: '/purchase-methods' },
          { label: form.title || '…' },
        ]"
      >
        <template #actions>
          <UButton
            color="error"
            variant="outline"
            icon="i-tabler-trash"
            :loading="deleteMutation.isPending.value"
            @click="deleteMutation.mutate()"
          >
            Удалить
          </UButton>
          <UButton
            color="primary"
            icon="i-tabler-device-floppy"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
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
                <UInput v-model="form.title" size="sm" />
              </UFormField>
              <UFormField label="Описание">
                <UTextarea v-model="form.description" :rows="3" />
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
    </template>
  </PageContainer>
</template>
