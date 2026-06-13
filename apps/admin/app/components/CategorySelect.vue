<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";

const model = defineModel<string>({ required: true });

const { $orpc, $orpcClient } = useNuxtApp();
const queryClient = useQueryClient();
const { options } = useCategoryOptions();

const creating = ref(false);
const newTitle = ref("");

const createMut = useMutation({
  mutationFn: () => $orpcClient.pageCategories.create({ title: newTitle.value.trim() }),
  onSuccess: (created) => {
    queryClient.invalidateQueries({ queryKey: $orpc.pageCategories.key() });
    if (created) model.value = created.id;
    newTitle.value = "";
    creating.value = false;
  },
});
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <USelect v-model="model" :items="options" placeholder="Без категории" class="flex-1" />
      <UButton
        variant="ghost"
        icon="i-solar-add-circle-linear"
        title="Новая категория"
        @click="creating = !creating"
      />
    </div>
    <div v-if="creating" class="flex items-center gap-2">
      <UInput
        v-model="newTitle"
        size="sm"
        placeholder="Название категории"
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
