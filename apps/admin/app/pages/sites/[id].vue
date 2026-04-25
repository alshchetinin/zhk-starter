<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data, isPending } = useQuery(
  computed(() => $orpc.sites.getById.queryOptions({ input: { id: id.value } })),
);

const { data: siteContacts } = useQuery(
  computed(() => $orpc.contacts.listBySite.queryOptions({ input: { siteId: id.value } })),
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
    <div class="mb-6 flex items-center gap-3">
      <UButton variant="ghost" icon="i-tabler-arrow-left" @click="router.push('/sites')" />
      <h1 class="text-2xl font-bold">{{ data?.name ?? "Сайт" }}</h1>
      <UBadge v-if="data?.isPrimary" color="primary" variant="subtle" icon="i-tabler-home-star">
        Главный
      </UBadge>
    </div>

    <div v-if="isPending" class="text-(--ui-text-muted)">Загрузка...</div>

    <div v-else-if="data" class="max-w-xl flex flex-col gap-4">
      <UFormField label="Slug (поддомен)" required>
        <UInput v-model="form.slug" :disabled="data.isPrimary" />
      </UFormField>
      <UFormField label="Название" required>
        <UInput v-model="form.name" />
      </UFormField>
      <UFormField label="Свой домен" hint="опционально">
        <UInput v-model="form.customDomain" placeholder="msk-neometria.ru" />
      </UFormField>

      <div class="mt-4 border border-(--ui-border) p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Контакты на сайте</h2>
          <NuxtLink to="/contacts" class="text-sm text-(--ui-text-muted) hover:underline">
            Управлять контактами →
          </NuxtLink>
        </div>

        <UFormField label="В хедере" description="Обычно 1 запись — телефон/email">
          <USelectMenu
            v-model="form.contactsHeaderIds"
            :items="contactItems"
            multiple
            value-key="value"
            placeholder="Выбрать контакты"
            class="w-full"
          />
        </UFormField>

        <UFormField label="В футере" description="Одна или несколько записей">
          <USelectMenu
            v-model="form.contactsFooterIds"
            :items="contactItems"
            multiple
            value-key="value"
            placeholder="Выбрать контакты"
            class="w-full"
          />
        </UFormField>
      </div>

      <div>
        <UButton
          :loading="updateMutation.isPending.value"
          class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted)"
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
  </PageContainer>
</template>
