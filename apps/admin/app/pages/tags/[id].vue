<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const tagId = computed(() => route.params.id as string);

const { data: tag, isPending } = useQuery(
  computed(() => $orpc.tags.getById.queryOptions({ input: { id: tagId.value } })),
);

useHead({ title: computed(() => tag.value?.name) });

const form = reactive({
  name: "",
  description: "",
  imageUrl: "",
});

watch(
  tag,
  (t) => {
    if (!t) return;
    form.name = t.name;
    form.description = t.description ?? "";
    form.imageUrl = t.imageUrl ?? "";
  },
  { immediate: true },
);

const isImported = computed(() => Boolean(tag.value?.integrationId));

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.tags.update({
      id: tagId.value,
      name: form.name,
      description: form.description || null,
      imageUrl: form.imageUrl || null,
    }),
  onSuccess: () => {
    toast.add({ title: "Сохранено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.tags.key() });
  },
});

const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.tags.delete({ id: tagId.value }),
  onSuccess: () => {
    toast.add({ title: "Тег удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.tags.key() });
    router.push("/tags");
  },
  onError: (err: Error) => {
    toast.add({ title: "Не удалось удалить", description: err.message, color: "error" });
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      :title="tag?.name ?? 'Тег'"
      back="/tags"
      :crumbs="[
        { label: 'Теги', to: '/tags' },
        { label: tag?.name ?? '…' },
      ]"
    >
      <template #actions>
        <UButton
          v-if="!isImported"
          color="error"
          variant="ghost"
          icon="i-solar-trash-bin-trash-linear"
          :loading="deleteMutation.isPending.value"
          @click="deleteMutation.mutate()"
        >
          Удалить
        </UButton>
        <UButton
          color="primary"
          icon="i-solar-diskette-linear"
          :loading="updateMutation.isPending.value"
          :disabled="!form.name"
          @click="updateMutation.mutate()"
        >
          Сохранить
        </UButton>
      </template>
    </AppPageHeader>

    <div v-if="isPending && !tag" class="text-center py-12 text-(--ui-text-dimmed)">
      Загрузка…
    </div>

    <div v-else-if="tag" class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div class="lg:col-span-2 space-y-3">
        <UAlert
          v-if="isImported"
          color="warning"
          variant="subtle"
          icon="i-solar-cloud-download-linear"
          title="Импортированный тег"
          description="Название перезапишется при следующей синхронизации. Описание и изображение остаются ручными — они не затрагиваются."
        />

        <AppDataCard title="Основные">
          <div class="space-y-3">
            <UFormField label="Название" required>
              <UInput v-model="form.name" size="sm" />
            </UFormField>
            <UFormField label="Описание">
              <UTextarea v-model="form.description" :rows="3" />
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
