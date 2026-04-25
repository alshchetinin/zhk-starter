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
    <AppPageHeader
      title="Новый банк"
      back="/mortgage/banks"
      :crumbs="[
        { label: 'Ипотека', to: '/mortgage' },
        { label: 'Банки', to: '/mortgage/banks' },
        { label: 'Новый' },
      ]"
    >
      <template #actions>
        <UButton
          color="primary"
          icon="i-tabler-device-floppy"
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
              <UInput
                v-model="form.name"
                placeholder="Например, Сбербанк"
                size="sm"
              />
            </UFormField>
            <UFormField label="Описание">
              <UTextarea
                v-model="form.description"
                placeholder="Короткое описание банка…"
                :rows="3"
              />
            </UFormField>
            <UFormField label="Сайт">
              <UInput
                v-model="form.website"
                placeholder="https://…"
                size="sm"
              />
            </UFormField>
            <UFormField label="Фирменный цвет" hint="HEX, например #1a7a3a">
              <UInput v-model="form.brandColor" placeholder="#…" size="sm" />
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
  </PageContainer>
</template>
