<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const router = useRouter();
const queryClient = useQueryClient();

const form = reactive({
  name: "",
  description: "",
  imageUrl: "",
});

const createMutation = useMutation({
  mutationFn: () =>
    $orpcClient.tags.create({
      name: form.name,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
    }),
  onSuccess: () => {
    toast.add({ title: "Тег создан", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.tags.key() });
    router.push("/tags");
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Новый тег"
      back="/tags"
      :crumbs="[{ label: 'Теги', to: '/tags' }, { label: 'Новый' }]"
    >
      <template #actions>
        <UButton
          color="primary"
          icon="i-solar-diskette-linear"
          :loading="createMutation.isPending.value"
          :disabled="!form.name"
          @click="createMutation.mutate()"
        >
          Сохранить
        </UButton>
      </template>
    </AppPageHeader>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div class="lg:col-span-2 space-y-3">
        <AppDataCard title="Основные">
          <div class="space-y-3">
            <UFormField label="Название" required>
              <UInput v-model="form.name" placeholder="Видовая, у парка…" size="sm" />
            </UFormField>
            <UFormField label="Описание">
              <UTextarea
                v-model="form.description"
                placeholder="Короткое описание…"
                :rows="3"
              />
            </UFormField>
          </div>
        </AppDataCard>
      </div>

      <div class="space-y-3">
        <AppDataCard title="Изображение">
          <ImageUpload
            :model-value="form.imageUrl || null"
            folder="tags"
            @update:model-value="form.imageUrl = $event ?? ''"
          />
        </AppDataCard>
      </div>
    </div>
  </PageContainer>
</template>
