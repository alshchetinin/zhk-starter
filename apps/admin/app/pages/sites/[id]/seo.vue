<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data, isPending } = useQuery(
  computed(() => $orpc.sites.getById.queryOptions({ input: { id: id.value } })),
);

useHead({
  title: computed(() => (data.value ? `SEO — ${data.value.name}` : "SEO")),
});

const { data: siteContacts } = useQuery(
  computed(() =>
    $orpc.contacts.listBySite.queryOptions({ input: { siteId: id.value } }),
  ),
);

const form = ref({
  seoDefaultTitle: "",
  seoTitleSuffix: "",
  seoDefaultDescription: "",
  seoDefaultOgImage: null as string | null,
  seoFavicon: null as string | null,
  seoIndexingEnabled: true,
  seoYandexVerification: "",
  seoGoogleVerification: "",
  seoOrgName: "",
  seoOrgLegalName: "",
  seoOrgLogo: null as string | null,
  seoOrgContactId: null as string | null,
});

watchEffect(() => {
  if (data.value) {
    const seo = data.value.settings?.seo;
    form.value = {
      seoDefaultTitle: seo?.defaultTitle ?? "",
      seoTitleSuffix: seo?.titleSuffix ?? "",
      seoDefaultDescription: seo?.defaultDescription ?? "",
      seoDefaultOgImage: seo?.defaultOgImage ?? null,
      seoFavicon: seo?.favicon ?? null,
      seoIndexingEnabled: seo?.indexingEnabled ?? true,
      seoYandexVerification: seo?.yandexVerification ?? "",
      seoGoogleVerification: seo?.googleVerification ?? "",
      seoOrgName: seo?.organization?.name ?? "",
      seoOrgLegalName: seo?.organization?.legalName ?? "",
      seoOrgLogo: seo?.organization?.logo ?? null,
      seoOrgContactId: seo?.organization?.contactId ?? null,
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
      settings: {
        seo: {
          defaultTitle: form.value.seoDefaultTitle.trim() || undefined,
          titleSuffix: form.value.seoTitleSuffix.trim() || undefined,
          defaultDescription: form.value.seoDefaultDescription.trim() || undefined,
          defaultOgImage: form.value.seoDefaultOgImage || undefined,
          favicon: form.value.seoFavicon || undefined,
          indexingEnabled: form.value.seoIndexingEnabled,
          yandexVerification: form.value.seoYandexVerification.trim() || undefined,
          googleVerification: form.value.seoGoogleVerification.trim() || undefined,
          organization: {
            name: form.value.seoOrgName.trim() || undefined,
            legalName: form.value.seoOrgLegalName.trim() || undefined,
            logo: form.value.seoOrgLogo || undefined,
            contactId: form.value.seoOrgContactId || undefined,
          },
        },
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
      <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
      Загрузка…
    </div>

    <template v-else-if="data">
      <AppPageHeader
        title="SEO"
        :back="`/sites/${id}/settings`"
        :crumbs="[
          { label: 'Сайты', to: '/sites' },
          { label: data.name ?? 'Сайт', to: `/sites/${id}/settings` },
          { label: 'SEO' },
        ]"
      />

      <div class="max-w-2xl space-y-3">
        <AppDataCard title="SEO">
          <div class="space-y-3">
            <UFormField
              label="Title по умолчанию"
              description="Для главной и страниц без своего meta title"
            >
              <UInput v-model="form.seoDefaultTitle" size="sm" />
            </UFormField>
            <UFormField
              label="Суффикс title"
              description="Добавляется ко всем заголовкам страниц"
            >
              <UInput
                v-model="form.seoTitleSuffix"
                placeholder="— ЖК Новый Горизонт"
                size="sm"
              />
            </UFormField>
            <UFormField label="Description по умолчанию">
              <UTextarea v-model="form.seoDefaultDescription" :rows="2" size="sm" />
            </UFormField>
            <UFormField
              label="OG-изображение по умолчанию"
              description="Для соцсетей, когда у страницы нет своего"
            >
              <ImageUpload v-model="form.seoDefaultOgImage" folder="uploads/seo" />
            </UFormField>
            <UFormField label="Favicon" description="Квадратная картинка, PNG или SVG">
              <ImageUpload v-model="form.seoFavicon" folder="uploads/seo" />
            </UFormField>
            <UFormField
              label="Разрешить индексацию"
              description="Сайт под паролем или неактивный закрыт от поисковиков независимо от переключателя"
            >
              <USwitch v-model="form.seoIndexingEnabled" />
            </UFormField>
            <UFormField label="Яндекс.Вебмастер" hint="yandex-verification">
              <UInput v-model="form.seoYandexVerification" size="sm" />
            </UFormField>
            <UFormField label="Google Search Console" hint="google-site-verification">
              <UInput v-model="form.seoGoogleVerification" size="sm" />
            </UFormField>

            <div class="space-y-3 border-t border-(--ui-border) pt-3">
              <div class="text-xs font-medium uppercase tracking-wide text-(--ui-text-dimmed)">
                Организация (schema.org)
              </div>
              <UFormField label="Название" description="По умолчанию — название сайта">
                <UInput v-model="form.seoOrgName" size="sm" />
              </UFormField>
              <UFormField label="Юридическое название">
                <UInput v-model="form.seoOrgLegalName" size="sm" />
              </UFormField>
              <UFormField label="Логотип">
                <ImageUpload v-model="form.seoOrgLogo" folder="uploads/seo" />
              </UFormField>
              <UFormField
                label="Контакт для телефона и адреса"
                description="Телефон и адрес организации в разметке schema.org"
              >
                <USelectMenu
                  v-model="form.seoOrgContactId"
                  :items="contactItems"
                  value-key="value"
                  clear
                  placeholder="Авто — первый контакт футера"
                  size="sm"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </AppDataCard>

        <div class="flex items-center gap-2 pt-1">
          <UButton
            color="primary"
            icon="i-solar-diskette-linear"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </UButton>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
