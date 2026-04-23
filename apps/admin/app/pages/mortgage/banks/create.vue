<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query";

const { $orpcClient } = useNuxtApp();
const toast = useToast();
const router = useRouter();

const form = reactive({
  name: "",
  logo: null as string | null,
  description: "",
  website: "",
  brandColor: "",
});

const createMutation = useMutation({
  mutationFn: () =>
    $orpcClient.banks.create({
      name: form.name,
      logo: form.logo ?? undefined,
      description: form.description || undefined,
      website: form.website || undefined,
      brandColor: form.brandColor || undefined,
    }),
  onSuccess: () => {
    toast.add({ title: "Банк создан", color: "success" });
    router.push("/mortgage/banks");
  },
});
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/mortgage/banks">
          <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
        </NuxtLink>
        <h1 class="text-2xl font-bold">Новый банк</h1>
      </div>
      <UButton
        icon="i-tabler-device-floppy"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
        :loading="createMutation.isPending.value"
        :disabled="!form.name"
        @click="createMutation.mutate()"
      >
        Сохранить
      </UButton>
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
            <UTextarea
              v-model="form.description"
              placeholder="Короткое описание банка..."
              :rows="3"
            />
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
  </PageContainer>
</template>
