<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const open = defineModel<boolean>("open", { required: true });

const { $orpc, $orpcClient } = useNuxtApp();
const queryClient = useQueryClient();
const toast = useToast();

const { data: categories } = useQuery(
  computed(() => $orpc.pageCategories.list.queryOptions()),
);

function invalidate() {
  queryClient.invalidateQueries({ queryKey: $orpc.pageCategories.key() });
  queryClient.invalidateQueries({ queryKey: $orpc.pages.key() });
}

const newTitle = ref("");
const createMut = useMutation({
  mutationFn: () => $orpcClient.pageCategories.create({ title: newTitle.value.trim() }),
  onSuccess: () => {
    newTitle.value = "";
    invalidate();
  },
  onError: () => {
    toast.add({ title: "Не удалось создать категорию", color: "error" });
  },
});

const renameMut = useMutation({
  mutationFn: (v: { id: string; title: string }) => $orpcClient.pageCategories.update(v),
  onSuccess: invalidate,
  onError: () => {
    toast.add({ title: "Не удалось переименовать категорию", color: "error" });
  },
});

const reorderMut = useMutation({
  mutationFn: (ids: string[]) => $orpcClient.pageCategories.reorder({ ids }),
  // Optimistic: reorder the cached list immediately so rapid arrow clicks
  // compound instead of each operating on the same stale server order.
  onMutate: async (ids) => {
    const key = $orpc.pageCategories.list.queryKey();
    await queryClient.cancelQueries({ queryKey: key });
    const prev = queryClient.getQueryData<typeof categories.value>(key);
    if (prev) {
      const byId = new Map(prev.map((c) => [c.id, c]));
      queryClient.setQueryData(
        key,
        ids.map((id, i) => ({ ...byId.get(id)!, sortOrder: i })),
      );
    }
    return { prev, key };
  },
  onError: (_e, _ids, ctx) => {
    if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev);
    toast.add({ title: "Не удалось изменить порядок", color: "error" });
  },
  onSettled: invalidate,
});

const deleteMut = useMutation({
  mutationFn: (id: string) => $orpcClient.pageCategories.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Категория удалена", color: "success" });
    toDelete.value = null;
    invalidate();
  },
  onError: () => {
    toast.add({ title: "Не удалось удалить категорию", color: "error" });
  },
});

const toDelete = ref<{ id: string; title: string; pageCount: number } | null>(null);

// Local editable copies of titles, keyed by category id. Avoids relying on
// UInput's change-event payload — rename reads from this map on blur.
const titles = reactive<Record<string, string>>({});
watch(
  categories,
  (cats) => {
    if (!cats) return;
    for (const c of cats) {
      if (titles[c.id] === undefined) titles[c.id] = c.title;
    }
  },
  { immediate: true },
);

function move(index: number, dir: -1 | 1) {
  const list = categories.value ? [...categories.value] : [];
  const target = index + dir;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target]!, list[index]!];
  reorderMut.mutate(list.map((c) => c.id));
}

function rename(id: string, current: string) {
  const next = (titles[id] ?? "").trim();
  if (!next || next === current) return;
  renameMut.mutate({ id, title: next });
}
</script>

<template>
  <UModal v-model:open="open" title="Категории страниц">
    <template #body>
      <div class="space-y-2">
        <div
          v-for="(cat, i) in categories ?? []"
          :key="cat.id"
          class="flex items-center gap-2"
        >
          <div class="flex flex-col">
            <UButton
              variant="ghost"
              size="xs"
              icon="i-solar-alt-arrow-up-linear"
              :disabled="i === 0"
              @click="move(i, -1)"
            />
            <UButton
              variant="ghost"
              size="xs"
              icon="i-solar-alt-arrow-down-linear"
              :disabled="i === (categories?.length ?? 0) - 1"
              @click="move(i, 1)"
            />
          </div>
          <UInput
            v-model="titles[cat.id]"
            size="sm"
            class="flex-1"
            @blur="rename(cat.id, cat.title)"
            @keydown.enter.prevent="rename(cat.id, cat.title)"
          />
          <span class="text-xs text-(--ui-text-dimmed) tabular-nums w-16 text-right">
            {{ cat.pageCount }} стр.
          </span>
          <UButton
            variant="ghost"
            size="xs"
            color="error"
            icon="i-solar-trash-bin-trash-linear"
            @click="toDelete = { id: cat.id, title: cat.title, pageCount: cat.pageCount }"
          />
        </div>

        <p v-if="!categories?.length" class="text-sm text-(--ui-text-muted) py-4 text-center">
          Категорий пока нет.
        </p>

        <div class="flex items-center gap-2 pt-2 border-t border-(--ui-border)">
          <UInput
            v-model="newTitle"
            size="sm"
            placeholder="Новая категория"
            class="flex-1"
            @keydown.enter.prevent="newTitle.trim() && createMut.mutate()"
          />
          <UButton
            size="sm"
            :loading="createMut.isPending.value"
            :disabled="!newTitle.trim()"
            @click="createMut.mutate()"
          >
            Добавить
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <UModal
    :open="toDelete != null"
    title="Удалить категорию?"
    @update:open="(v: boolean) => { if (!v) toDelete = null }"
  >
    <template #body>
      <p class="text-sm text-(--ui-text-muted)">
        Категория <b>{{ toDelete?.title ?? '—' }}</b> будет удалена.
        <template v-if="toDelete?.pageCount">
          У {{ toDelete.pageCount }} страниц(ы) категория будет снята (сами страницы останутся).
        </template>
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="outline" @click="toDelete = null">Отмена</UButton>
        <UButton
          color="error"
          :loading="deleteMut.isPending.value"
          @click="toDelete && deleteMut.mutate(toDelete.id)"
        >
          Удалить
        </UButton>
      </div>
    </template>
  </UModal>
</template>
