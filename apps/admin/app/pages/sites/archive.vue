<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data, isPending } = useQuery($orpc.sites.listArchived.queryOptions());

const restoreMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.sites.restore({ id }),
  onSuccess: () => {
    toast.add({
      title: "Сайт восстановлен",
      description: "Он вернулся в список как скрытый — включите его, когда будет готов",
      color: "success",
    });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
  },
  onError: () => {
    toast.add({ title: "Не удалось восстановить", color: "error" });
  },
});

// удаление навсегда — с подтверждением вводом slug
const deleteTarget = ref<{ id: string; name: string; slug: string } | null>(null);
const deleteConfirm = ref("");
watch(deleteTarget, () => { deleteConfirm.value = ""; });
const deleteAllowed = computed(
  () => !!deleteTarget.value && deleteConfirm.value.trim() === deleteTarget.value.slug,
);

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.sites.deletePermanent({ id }),
  onSuccess: () => {
    toast.add({ title: "Сайт удалён навсегда", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
    deleteTarget.value = null;
  },
  onError: () => {
    toast.add({ title: "Не удалось удалить", color: "error" });
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Архив сайтов"
      subtitle="Сайты в архиве не открываются в вебе. Их можно восстановить или удалить навсегда."
    >
      <template #actions>
        <UButton to="/sites" variant="outline" icon="i-solar-arrow-left-linear">
          К сайтам
        </UButton>
      </template>
    </AppPageHeader>

    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
      Загрузка…
    </div>

    <AppDataCard v-else-if="data?.length" flush>
      <div class="divide-y divide-(--ui-border)">
        <div
          v-for="item in data"
          :key="item.id"
          class="group flex items-center gap-3 px-4 py-3 hover:bg-(--ui-bg-elevated) transition"
        >
          <div
            class="size-10 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0"
          >
            <UIcon name="i-solar-archive-linear" class="size-5 text-(--ui-text-dimmed)" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold truncate">{{ item.name }}</span>
              <AppStatusPill tone="neutral" label="В архиве" dot />
            </div>
            <div class="flex items-center gap-3 text-[11px] text-(--ui-text-dimmed) mt-0.5">
              <span class="font-mono">{{ item.slug }}</span>
              <span v-if="item.customDomain" class="font-mono">· {{ item.customDomain }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
            <UButton
              variant="ghost"
              icon="i-solar-restart-linear"
              title="Восстановить"
              :loading="restoreMutation.isPending.value"
              @click="restoreMutation.mutate(item.id)"
            />
            <UButton
              variant="ghost"
              color="error"
              icon="i-solar-trash-bin-trash-linear"
              title="Удалить навсегда"
              @click="deleteTarget = { id: item.id, name: item.name, slug: item.slug }"
            />
          </div>
        </div>
      </div>
    </AppDataCard>

    <AppEmptyState
      v-else
      icon="i-solar-archive-linear"
      title="Архив пуст"
      description="Сюда попадают сайты, отправленные в архив из списка сайтов."
    />

    <UModal
      :open="!!deleteTarget"
      title="Удалить сайт навсегда?"
      @update:open="(v) => { if (!v) deleteTarget = null }"
    >
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-(--ui-text-muted)">
            Действие необратимо. Будут безвозвратно удалены ВСЕ данные сайта
            «{{ deleteTarget?.name }}»: страницы, новости, проекты, каталог,
            контакты и т.д.
          </p>
          <UFormField :label="`Для подтверждения введите slug сайта: ${deleteTarget?.slug}`">
            <UInput v-model="deleteConfirm" :placeholder="deleteTarget?.slug" size="sm" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton variant="outline" @click="deleteTarget = null">Отмена</UButton>
          <UButton
            color="error"
            :loading="deleteMutation.isPending.value"
            :disabled="!deleteAllowed"
            @click="deleteMutation.mutate(deleteTarget!.id)"
          >
            Удалить навсегда
          </UButton>
        </div>
      </template>
    </UModal>
  </PageContainer>
</template>
