<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const model = defineModel<string[]>({ required: true });

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data: tagsData } = useQuery(
  $orpc.tags.list.queryOptions({ input: { page: 1, pageSize: 100 } }),
);

const newTagName = ref("");

const options = computed(() =>
  (tagsData.value?.data ?? []).map((t) => ({
    label: t.name + (t.integrationId ? "  · импорт" : ""),
    value: t.id,
  })),
);

const createMutation = useMutation({
  mutationFn: (name: string) => $orpcClient.tags.create({ name }),
  onSuccess: (created) => {
    if (!created) return;
    queryClient.invalidateQueries({ queryKey: $orpc.tags.key() });
    model.value = [...model.value, created.id];
    newTagName.value = "";
    toast.add({ title: `Тег «${created.name}» создан`, color: "success" });
  },
  onError: (err: Error) => {
    toast.add({ title: "Не удалось создать", description: err.message, color: "error" });
  },
});

function handleCreate() {
  const name = newTagName.value.trim();
  if (!name) return;
  createMutation.mutate(name);
}
</script>

<template>
  <div class="space-y-2">
    <USelectMenu
      v-model="model"
      :items="options"
      value-key="value"
      multiple
      searchable
      placeholder="Выберите теги"
      size="sm"
      class="w-full"
    />

    <div class="flex items-center gap-2">
      <UInput
        v-model="newTagName"
        placeholder="Новый тег…"
        size="sm"
        class="flex-1"
        @keydown.enter.prevent="handleCreate"
      />
      <UButton
        icon="i-tabler-plus"
        size="sm"
        variant="soft"
        :loading="createMutation.isPending.value"
        :disabled="!newTagName.trim()"
        @click="handleCreate"
      >
        Создать
      </UButton>
    </div>
  </div>
</template>
