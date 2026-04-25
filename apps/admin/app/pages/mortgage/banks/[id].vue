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
    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <template v-else-if="bank">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/mortgage/banks">
            <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
          </NuxtLink>
          <h1 class="text-2xl font-bold">{{ form.name || "Редактирование" }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            color="error"
            icon="i-tabler-trash"
            class="rounded-md"
            :loading="deleteMutation.isPending.value"
            @click="deleteMutation.mutate()"
          >
            Удалить
          </UButton>
          <UButton
            icon="i-tabler-device-floppy"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted)"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </UButton>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div class="lg:col-span-2 space-y-3">
          <div
            class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
          >
            <UFormField label="Название">
              <UInput v-model="form.name" placeholder="Например, Сбербанк" size="lg" />
            </UFormField>

            <UFormField label="Описание">
              <UTextarea v-model="form.description" :rows="3" />
            </UFormField>

            <UFormField label="Сайт">
              <UInput v-model="form.website" placeholder="https://..." />
            </UFormField>

            <UFormField label="Фирменный цвет" hint="HEX, например #1a7a3a">
              <UInput v-model="form.brandColor" placeholder="#..." />
            </UFormField>
          </div>
        </div>

        <div class="space-y-3">
          <div
            class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4"
          >
            <UFormField label="Логотип">
              <ImageUpload v-model="form.logo" folder="banks/logos" />
            </UFormField>
          </div>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
