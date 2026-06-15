<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import type { ModalField } from "@zhk/api/shared/modal-fields";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data: modal, isPending } = useQuery(
  computed(() => $orpc.modals.getById.queryOptions({ input: { id: id.value } })),
);

const { data: receivers } = useQuery($orpc.formReceivers.list.queryOptions());

useHead({ title: computed(() => modal.value?.title) });

const form = reactive({
  title: "",
  slug: "",
  description: "",
  image: null as string | null,
  successMessage: "",
  status: "draft" as ModalStatus,
  fields: [] as ModalField[],
  receiverIds: [] as string[],
});

const slugManuallyEdited = ref(true);

whenever(
  modal,
  (val) => {
    form.title = val.title;
    form.slug = val.slug;
    form.description = val.description ?? "";
    form.image = val.image ?? null;
    form.successMessage = val.successMessage ?? "";
    form.status = val.status;
    form.fields = (val.fields as ModalField[]) ?? [];
    form.receiverIds = (val.receiverIds as string[]) ?? [];
  },
  { once: true, immediate: true },
);

watch(
  () => form.title,
  (val) => {
    if (!slugManuallyEdited.value) {
      form.slug = slugify(val);
    }
  },
);

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.modals.update({
      id: id.value,
      title: form.title,
      slug: form.slug,
      description: form.description || null,
      image: form.image,
      successMessage: form.successMessage || null,
      status: form.status,
      fields: form.fields,
      receiverIds: form.receiverIds,
    }),
  onSuccess: () => {
    toast.add({ title: "Модальное окно обновлено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.modals.key() });
  },
});

const deleteMutation = useMutation({
  mutationFn: () => $orpcClient.modals.delete({ id: id.value }),
  onSuccess: () => {
    toast.add({ title: "Модальное окно удалено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.modals.key() });
    router.push("/modals");
  },
});
</script>

<template>
  <PageContainer>
    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-solar-refresh-linear" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <template v-else-if="modal">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/modals">
            <UButton variant="ghost" icon="i-solar-arrow-left-linear" size="sm" />
          </NuxtLink>
          <h1 class="text-2xl font-bold">{{ form.title || "Редактирование" }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            color="error"
            icon="i-solar-trash-bin-trash-linear"
           
            :loading="deleteMutation.isPending.value"
            @click="deleteMutation.mutate()"
          >
            Удалить
          </UButton>
          <UButton
            icon="i-solar-diskette-linear"
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

          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 space-y-3">
            <h3 class="text-sm font-semibold">Приёмщики</h3>
            <p class="text-xs text-(--ui-text-dimmed)">Куда уходит эта форма. Настроить — в разделе «Заявки → Приёмщики».</p>
            <div v-if="!receivers?.length" class="text-xs text-(--ui-text-muted)">
              Приёмщиков нет. <NuxtLink to="/tickets/receivers" class="underline">Добавить</NuxtLink>
            </div>
            <div v-for="r in receivers" :key="r.id" class="flex items-center gap-2">
              <UCheckbox
                :model-value="form.receiverIds.includes(r.id)"
                :label="r.name"
                @update:model-value="(v) => { form.receiverIds = v ? [...form.receiverIds, r.id] : form.receiverIds.filter((x) => x !== r.id); }"
              />
              <UBadge v-if="!r.enabled" color="neutral" variant="subtle" size="xs">выключен</UBadge>
            </div>
          </div>

          <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
            <h3 class="text-sm font-medium text-(--ui-text-muted) mb-2">Использование</h3>
            <p class="text-xs text-(--ui-text-dimmed)">
              Используйте <code class="font-mono bg-(--ui-bg-elevated) px-1 rounded">modal:{{ form.slug }}</code> в полях ссылок блоков для открытия этого окна.
            </p>
          </div>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
