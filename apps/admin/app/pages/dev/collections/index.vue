<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data, isPending } = useQuery($orpc.dev.collections.list.queryOptions());

const deleteMutation = useMutation({
  mutationFn: (args: { kebab: string; force: boolean }) =>
    $orpcClient.dev.collections.delete(args),
  onSuccess: (res) => {
    toast.add({
      title: `Коллекция "${res.kebab}" удалена`,
      description: res.warning,
      color: "warning",
    });
  },
  onError: (err: Error) => {
    toast.add({ title: "Ошибка удаления", description: err.message, color: "error" });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: $orpc.dev.collections.key() });
  },
});

async function confirmDelete(kebab: string, label: string | null) {
  const name = label ?? kebab;
  const { references } = await $orpcClient.dev.collections.deleteCheck({ kebab });

  const base = `Удалить коллекцию "${name}"?\n\nБудут удалены 5 файлов + регистрации.\nТаблица в БД сохранится.`;

  if (references.length === 0) {
    if (window.confirm(base)) deleteMutation.mutate({ kebab, force: false });
    return;
  }

  const refList = references.slice(0, 15).map((r) => `  ${r}`).join("\n");
  const more = references.length > 15 ? `\n  … и ещё ${references.length - 15}` : "";
  const forceMsg =
    `${base}\n\n⚠ Внешние ссылки на коллекцию (${references.length}):\n${refList}${more}\n\n` +
    `Удаление сломает эти файлы. Продолжить (force)?`;
  if (window.confirm(forceMsg)) deleteMutation.mutate({ kebab, force: true });
}

const sectionLabel = {
  content: "Контент",
  catalog: "Каталог",
  system: "Система",
} as const;
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Коллекции</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          Конструктор сущностей: БД-таблица + API + админ-страницы. Изменения пишутся в исходники,
          <code class="text-xs">pnpm db:push</code> запускается автоматически.
        </p>
      </div>
      <UButton to="/dev/collections/create" icon="i-tabler-plus" color="primary">
        Создать коллекцию
      </UButton>
    </div>

    <div v-if="isPending" class="text-sm text-(--ui-text-muted)">Загрузка...</div>

    <div v-else-if="data?.length" class="grid gap-2">
      <div
        v-for="col in data"
        :key="col.kebab"
        class="flex items-center gap-3 p-3 rounded-lg border border-(--ui-border) bg-(--ui-bg)"
      >
        <UIcon
          :name="col.icon ?? 'i-tabler-stack-2'"
          class="size-5 shrink-0 text-(--ui-text-muted)"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <div class="font-medium">{{ col.label ?? col.kebab }}</div>
            <UBadge v-if="col.section" size="xs" color="neutral" variant="soft">
              {{ sectionLabel[col.section] }}
            </UBadge>
            <code class="text-[11px] text-(--ui-text-dimmed) font-mono">{{ col.kebab }}</code>
          </div>
        </div>
        <UButton
          icon="i-tabler-trash"
          color="error"
          variant="ghost"
          size="sm"
          :loading="deleteMutation.isPending.value && deleteMutation.variables.value === col.kebab"
          @click="confirmDelete(col.kebab, col.label)"
        />
      </div>
    </div>

    <div v-else class="text-sm text-(--ui-text-muted) text-center py-8">Коллекции не найдены</div>
  </div>
</template>
