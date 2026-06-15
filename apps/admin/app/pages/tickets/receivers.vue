<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { receiverDefinitions, getReceiverDefaultConfig } from "@zhk/api/shared/receivers";
import { receiverConfigComponents } from "~/components/receivers/configRegistry";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data: receivers, isPending } = useQuery($orpc.formReceivers.list.queryOptions());

const open = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ type: "webhook", name: "", config: {} as Record<string, any>, enabled: true });

function startCreate(type: string) {
  editingId.value = null;
  form.type = type;
  form.name = receiverDefinitions.find((r) => r.type === type)?.label ?? type;
  form.config = getReceiverDefaultConfig(type);
  form.enabled = true;
  open.value = true;
}
function startEdit(r: any) {
  editingId.value = r.id;
  form.type = r.type;
  form.name = r.name;
  form.config = { ...r.config };
  form.enabled = r.enabled;
  open.value = true;
}

const saveMutation = useMutation({
  mutationFn: () =>
    editingId.value
      ? $orpcClient.formReceivers.update({ id: editingId.value!, name: form.name, config: form.config, enabled: form.enabled })
      : $orpcClient.formReceivers.create({ type: form.type as any, name: form.name, config: form.config, enabled: form.enabled }),
  onSuccess: () => {
    toast.add({ title: "Сохранено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.formReceivers.key() });
    open.value = false;
  },
  onError: (e: any) => toast.add({ title: e?.message ?? "Ошибка сохранения", color: "error" }),
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.formReceivers.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Приёмщик удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.formReceivers.key() });
  },
});

const toggleMutation = useMutation({
  mutationFn: (r: any) => $orpcClient.formReceivers.update({ id: r.id, enabled: !r.enabled }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: $orpc.formReceivers.key() }),
});

const testingId = ref<string | null>(null);
async function testReceiver(id: string) {
  testingId.value = id;
  try {
    const res = await $orpcClient.formReceivers.test({ id });
    if (res.ok) toast.add({ title: "Тест отправлен успешно", color: "success" });
    else toast.add({ title: "Тест не прошёл", description: (res as any).error, color: "error" });
  } catch (e: any) {
    toast.add({ title: e?.message ?? "Ошибка теста", color: "error" });
  } finally {
    testingId.value = null;
  }
}

const configComponent = computed(() => receiverConfigComponents[form.type]);
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/tickets">
          <UButton variant="ghost" icon="i-solar-arrow-left-linear" size="sm" />
        </NuxtLink>
        <div>
          <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">Приёмщики</h1>
          <p class="text-(--ui-text-muted) text-sm mt-1">Куда отправлять данные форм</p>
        </div>
      </div>
      <UDropdownMenu
        :items="receiverDefinitions.map((r) => ({ label: r.label, icon: r.icon, onSelect: () => startCreate(r.type) }))"
      >
        <UButton icon="i-solar-add-circle-linear">Добавить приёмщик</UButton>
      </UDropdownMenu>
    </div>

    <div v-if="isPending" class="flex justify-center py-20">
      <UIcon name="i-solar-refresh-linear" class="animate-spin text-3xl" />
    </div>

    <AppEmptyState
      v-else-if="!receivers?.length"
      icon="i-solar-inbox-linear"
      title="Приёмщиков пока нет"
      description="Добавьте webhook, Telegram или email, чтобы получать заявки."
    />

    <div v-else class="space-y-2 max-w-3xl">
      <div
        v-for="r in receivers"
        :key="r.id"
        class="flex items-center gap-3 border border-(--ui-border) rounded-lg p-4"
      >
        <UIcon :name="receiverTypeIcons[r.type]" class="text-xl text-(--ui-text-muted)" />
        <div class="flex-1 min-w-0">
          <div class="font-medium text-(--ui-text-highlighted) truncate">{{ r.name }}</div>
          <div class="text-xs text-(--ui-text-dimmed)">{{ receiverTypeLabels[r.type] }}</div>
        </div>
        <USwitch :model-value="r.enabled" @update:model-value="toggleMutation.mutate(r)" />
        <UButton variant="ghost" size="xs" icon="i-solar-test-tube-linear" :loading="testingId === r.id" @click="testReceiver(r.id)">Проверить</UButton>
        <UButton variant="ghost" size="xs" icon="i-solar-pen-linear" @click="startEdit(r)" />
        <UButton variant="ghost" size="xs" color="error" icon="i-solar-trash-bin-trash-linear" @click="deleteMutation.mutate(r.id)" />
      </div>
    </div>

    <UModal v-model:open="open" :title="editingId ? 'Редактирование приёмщика' : 'Новый приёмщик'">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Название" required>
            <UInput v-model="form.name" class="w-full" />
          </UFormField>
          <component :is="configComponent" v-if="configComponent" v-model="form.config" />
          <UFormField label="Включён">
            <USwitch v-model="form.enabled" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" @click="open = false">Отмена</UButton>
          <UButton :loading="saveMutation.isPending.value" @click="saveMutation.mutate()">Сохранить</UButton>
        </div>
      </template>
    </UModal>
  </PageContainer>
</template>
