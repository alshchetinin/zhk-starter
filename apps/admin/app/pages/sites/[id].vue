<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.sites.getById.queryOptions({ input: { id: id.value } }),
  ),
);

const { data: siteContacts } = useQuery(
  computed(() =>
    $orpc.contacts.listBySite.queryOptions({ input: { siteId: id.value } }),
  ),
);

const form = ref({
  slug: "",
  name: "",
  customDomain: "",
  contactsHeaderIds: [] as string[],
  contactsFooterIds: [] as string[],
});

watchEffect(() => {
  if (data.value) {
    form.value = {
      slug: data.value.slug,
      name: data.value.name,
      customDomain: data.value.customDomain ?? "",
      contactsHeaderIds: data.value.settings?.contactsHeaderIds ?? [],
      contactsFooterIds: data.value.settings?.contactsFooterIds ?? [],
    };
  }
});

const contactItems = computed(() =>
  (siteContacts.value ?? []).map((c) => ({ label: c.label, value: c.id })),
);

const updateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.sites.update({
      id: id.value,
      slug: form.value.slug.trim(),
      name: form.value.name.trim(),
      customDomain: form.value.customDomain.trim() || null,
      settings: {
        contactsHeaderIds: form.value.contactsHeaderIds,
        contactsFooterIds: form.value.contactsFooterIds,
      },
    }),
  onSuccess: () => {
    toast.add({ title: "Сохранено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
  },
  onError: () => toast.add({ title: "Ошибка сохранения", color: "error" }),
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

    <template v-else-if="data">
      <AppPageHeader
        :title="data.name ?? 'Сайт'"
        back="/sites"
        :crumbs="[
          { label: 'Сайты', to: '/sites' },
          { label: data.name ?? 'Сайт' },
        ]"
      >
        <template #actions>
          <AppStatusPill
            v-if="data.isPrimary"
            tone="warning"
            label="Главный"
            dot
          />
        </template>
      </AppPageHeader>

      <div class="max-w-2xl space-y-3">
        <AppDataCard title="Основные">
          <div class="space-y-3">
            <UFormField label="Slug (поддомен)" required>
              <UInput
                v-model="form.slug"
                :disabled="data.isPrimary"
                size="sm"
              />
            </UFormField>
            <UFormField label="Название" required>
              <UInput v-model="form.name" size="sm" />
            </UFormField>
            <UFormField label="Свой домен" hint="опционально">
              <UInput
                v-model="form.customDomain"
                placeholder="msk-example.ru"
                size="sm"
              />
            </UFormField>
          </div>
        </AppDataCard>

        <AppDataCard title="Контакты на сайте">
          <template #actions>
            <NuxtLink
              to="/contacts"
              class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text) transition"
            >
              управлять →
            </NuxtLink>
          </template>
          <div class="space-y-3">
            <UFormField
              label="В хедере"
              description="Обычно 1 запись — телефон/email"
            >
              <USelectMenu
                v-model="form.contactsHeaderIds"
                :items="contactItems"
                multiple
                value-key="value"
                placeholder="Выбрать контакты"
                size="sm"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="В футере"
              description="Одна или несколько записей"
            >
              <USelectMenu
                v-model="form.contactsFooterIds"
                :items="contactItems"
                multiple
                value-key="value"
                placeholder="Выбрать контакты"
                size="sm"
                class="w-full"
              />
            </UFormField>
          </div>
        </AppDataCard>

        <div class="flex items-center gap-2 pt-1">
          <UButton
            color="primary"
            icon="i-tabler-device-floppy"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </UButton>
        </div>

        <SocialLinksEditor
          :site-id="id"
          title="Соцсети этого сайта"
          description="Если задать хотя бы одну ссылку, она заменит общие соцсети компании"
        />
      </div>
    </template>
  </PageContainer>
</template>
