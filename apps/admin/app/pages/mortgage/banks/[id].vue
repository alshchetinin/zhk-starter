<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data: bank, isPending } = useQuery(
  computed(() => $orpc.banks.getById.queryOptions({ input: { id: id.value } })),
);

const form = reactive({
  name: "",
  logo: null as string | null,
  description: "",
  website: "",
  brandColor: "",
});

whenever(
  bank,
  (val) => {
    form.name = val.name;
    form.logo = val.logo ?? null;
    form.description = val.description ?? "";
    form.website = val.website ?? "";
    form.brandColor = val.brandColor ?? "";
  },
  { once: true, immediate: true },
);

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.banks.update({
      id: id.value,
      name: form.name,
      logo: form.logo,
      description: form.description || null,
      website: form.website || null,
      brandColor: form.brandColor || null,
    }),
  onSuccess: () => {
    toast.add({ title: "Банк обновлён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.banks.key() });
  },
});

const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.banks.delete({ id: id.value }),
  onSuccess: () => {
    toast.add({ title: "Банк удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.banks.key() });
    router.push("/mortgage/banks");
  },
  onError: (error) => {
    toast.add({ title: "Ошибка удаления", description: error.message, color: "error" });
  },
});
</script>

<template>
  <PageContainer>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <template v-else-if="bank">
      <AppPageHeader
        :title="form.name || 'Редактирование'"
        back="/mortgage/banks"
        :crumbs="[
          { label: 'Ипотека', to: '/mortgage' },
          { label: 'Банки', to: '/mortgage/banks' },
          { label: form.name || '…' },
        ]"
      >
        <template #actions>
          <button
            class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-red-500/40 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-500/10 transition disabled:opacity-40"
            :disabled="deleteMutation.isPending.value"
            @click="deleteMutation.mutate()"
          >
            <UIcon
              v-if="deleteMutation.isPending.value"
              name="i-tabler-loader-2"
              class="size-3.5 animate-spin"
            />
            <UIcon v-else name="i-tabler-trash" class="size-3.5" />
            Удалить
          </button>
          <AppToolbarButton
            variant="primary"
            icon="i-tabler-device-floppy"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </AppToolbarButton>
        </template>
      </AppPageHeader>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div class="lg:col-span-2 space-y-3">
          <AppDataCard title="Основные">
            <div class="space-y-3">
              <UFormField label="Название" required>
                <UInput
                  v-model="form.name"
                  placeholder="Например, Сбербанк"
                  size="sm"
                />
              </UFormField>
              <UFormField label="Описание">
                <UTextarea v-model="form.description" :rows="3" />
              </UFormField>
              <UFormField label="Сайт">
                <UInput
                  v-model="form.website"
                  placeholder="https://…"
                  size="sm"
                />
              </UFormField>
              <UFormField label="Фирменный цвет" hint="HEX, например #1a7a3a">
                <UInput
                  v-model="form.brandColor"
                  placeholder="#…"
                  size="sm"
                />
              </UFormField>
            </div>
          </AppDataCard>
        </div>

        <div class="space-y-3">
          <AppDataCard title="Логотип">
            <ImageUpload v-model="form.logo" folder="banks/logos" />
          </AppDataCard>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
