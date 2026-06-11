<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { BlockField } from "@zhk/api/shared/blocks";
import type { BlockMetaForm } from "~/utils/block-schema";
import { buildBlockPayload, isBlockFormValid } from "~/utils/block-schema";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();
const router = useRouter();

const meta = reactive<BlockMetaForm>({
  name: "",
  label: "",
  description: "",
  icon: "i-solar-box-linear",
  category: "none",
});

const fields = ref<BlockField[]>([]);

const createMutation = useMutation({
  mutationFn: (payload: object) => $orpcClient.dev.blocks.create(payload),
  onSuccess: () => {
    toast.add({ title: "Блок создан", description: "Vite HMR подхватит новые файлы", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.dev.blocks.key() });
    router.push("/dev/blocks");
  },
  onError: (err: Error) => {
    toast.add({ title: "Ошибка создания", description: err.message, color: "error" });
  },
});

const canSubmit = computed(() => isBlockFormValid(meta, fields.value));

function submit() {
  createMutation.mutate(buildBlockPayload(meta, fields.value));
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex items-center gap-2 mb-6">
      <UButton to="/dev/blocks" icon="i-solar-arrow-left-linear" variant="ghost" size="sm" />
      <h1 class="text-2xl font-semibold">Новый блок</h1>
    </div>

    <BlockSchemaForm mode="create" v-model:meta="meta" v-model:fields="fields" />

    <div class="flex justify-end gap-2 mt-4">
      <UButton to="/dev/blocks" variant="ghost">Отмена</UButton>
      <UButton
        color="primary"
        :disabled="!canSubmit"
        :loading="createMutation.isPending.value"
        @click="submit"
      >
        Создать блок
      </UButton>
    </div>
  </div>
</template>
