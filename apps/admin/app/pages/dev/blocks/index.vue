<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

// Типы без превью-PNG — показываем иконку вместо мини-превью.
const withoutPreview = ref(new Set<string>());
function markBroken(type: string) {
  withoutPreview.value = new Set(withoutPreview.value).add(type);
}

const { data, isPending } = useQuery({
  ...$orpc.dev.blocks.list.queryOptions(),
  staleTime: 0,
});

const deleteMutation = useMutation({
  mutationFn: (type: string) => $orpcClient.dev.blocks.delete({ type }),
  onSuccess: (_, type) => {
    toast.add({ title: `Блок "${type}" удалён`, color: "success" });
  },
  onError: (err: Error) => {
    toast.add({ title: "Ошибка удаления", description: err.message, color: "error" });
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: $orpc.dev.blocks.key() });
  },
});

function confirmDelete(type: string, label: string) {
  const answer = window.confirm(
    `Удалить блок "${label}" (${type})?\n\nБудут удалены определение, admin-редактор, web-рендерер, превью-PNG (если есть) и запись из blocks/index.ts.\nЭто действие необратимо без git revert.`,
  );
  if (answer) deleteMutation.mutate(type);
}
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Блоки</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          Конструктор типов блоков контента. Изменения пишутся в исходники — Vite HMR подхватит автоматически.
        </p>
      </div>
      <UButton to="/dev/blocks/create" icon="i-solar-add-square-linear" color="primary">
        Создать блок
      </UButton>
    </div>

    <div v-if="isPending" class="text-sm text-(--ui-text-muted)">Загрузка...</div>

    <div v-else-if="data" class="grid gap-2">
      <NuxtLink
        v-for="block in data"
        :key="block.type"
        :to="`/dev/blocks/${block.type}`"
        class="flex items-center gap-3 p-3 rounded-lg border border-(--ui-border) bg-(--ui-bg) hover:border-(--ui-border-accented) transition-colors"
      >
        <img
          v-if="!withoutPreview.has(block.type)"
          :src="`/block-previews/${block.type}.png`"
          alt=""
          loading="lazy"
          class="w-16 h-10 shrink-0 rounded border border-(--ui-border) object-cover object-top"
          @error="markBroken(block.type)"
        />
        <UIcon v-else :name="block.icon" class="size-5 shrink-0 text-(--ui-text-muted)" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <div class="font-medium">{{ block.label }}</div>
            <UBadge v-if="block.category === 'project'" size="xs" color="info" variant="soft">
              проектный
            </UBadge>
            <code class="text-[11px] text-(--ui-text-dimmed) font-mono">{{ block.type }}</code>
          </div>
          <div class="text-xs text-(--ui-text-muted) truncate">{{ block.description }}</div>
        </div>
        <UButton
          icon="i-solar-trash-bin-trash-linear"
          color="error"
          variant="ghost"
          size="sm"
          aria-label="Удалить блок"
          :loading="deleteMutation.isPending.value && deleteMutation.variables.value === block.type"
          @click.prevent.stop="confirmDelete(block.type, block.label)"
        />
      </NuxtLink>
    </div>
  </div>
</template>
