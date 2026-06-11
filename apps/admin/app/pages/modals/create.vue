<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query";
import type { ModalField } from "@zhk/api/shared/modal-fields";

const { $orpcClient } = useNuxtApp();
const toast = useToast();
const router = useRouter();

const form = reactive({
  title: "",
  slug: "",
  description: "",
  image: null as string | null,
  successMessage: "",
  status: "draft" as ModalStatus,
  fields: [] as ModalField[],
});

const slugManuallyEdited = ref(false);

watch(
  () => form.title,
  (val) => {
    if (!slugManuallyEdited.value) {
      form.slug = slugify(val);
    }
  },
);

const createMutation = useMutation({
  mutationFn: () =>
    $orpcClient.modals.create({
      title: form.title,
      slug: form.slug,
      description: form.description || undefined,
      image: form.image ?? undefined,
      successMessage: form.successMessage || undefined,
      status: form.status,
      fields: form.fields,
    }),
  onSuccess: () => {
    toast.add({ title: "Модальное окно создано", color: "success" });
    router.push("/modals");
  },
});
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/modals">
          <UButton variant="ghost" icon="i-solar-arrow-left-linear" size="sm" />
        </NuxtLink>
        <h1 class="text-2xl font-bold">Новое модальное окно</h1>
      </div>
      <UButton
        icon="i-solar-diskette-linear"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted)"
        :loading="createMutation.isPending.value"
        :disabled="!form.title || !form.slug"
        @click="createMutation.mutate()"
      >
        Сохранить
      </UButton>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div class="lg:col-span-2 space-y-3">
        <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4">
          <UFormField label="Заголовок">
            <UInput v-model="form.title" placeholder="Заказать звонок" size="lg" />
          </UFormField>

          <UFormField label="Slug">
            <UInput
              v-model="form.slug"
              placeholder="callback"
              @input="slugManuallyEdited = true"
            />
          </UFormField>

          <UFormField label="Описание" description="Текст под заголовком в модальном окне">
            <UTextarea v-model="form.description" placeholder="Оставьте заявку и мы перезвоним..." :rows="3" />
          </UFormField>

          <UFormField label="Сообщение после отправки" description="Показывается после нажатия кнопки в форме">
            <UInput v-model="form.successMessage" placeholder="Спасибо! Мы свяжемся с вами." />
          </UFormField>
        </div>

        <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4">
          <h3 class="text-sm font-semibold">Поля формы</h3>
          <ModalFieldsEditor v-model="form.fields" />
        </div>
      </div>

      <div class="space-y-3">
        <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4">
          <UFormField label="Статус">
            <USelect v-model="form.status" :items="modalStatusOptions" />
          </UFormField>
        </div>

        <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-4">
          <UFormField label="Изображение" description="Необязательная картинка в шапке модалки">
            <ImageUpload v-model="form.image" folder="modals" />
          </UFormField>
        </div>
      </div>
    </div>
  </PageContainer>
</template>
