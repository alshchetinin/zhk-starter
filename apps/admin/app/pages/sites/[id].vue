<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  METRIKA_COUNTER_ID_REGEX,
  TRACKING_EVENT_GROUPS,
} from "@zhk/api/shared/tracking";

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
  isActive: true,
  accessPassword: "",
  contactsHeaderIds: [] as string[],
  contactsFooterIds: [] as string[],
  metrikaCounterId: "",
  metrikaWebvisor: false,
  metrikaClickmap: true,
  metrikaTrackLinks: true,
  metrikaAccurateBounce: true,
});

watchEffect(() => {
  if (data.value) {
    const ym = data.value.settings?.analytics?.yandexMetrika;
    form.value = {
      slug: data.value.slug,
      name: data.value.name,
      customDomain: data.value.customDomain ?? "",
      isActive: data.value.isActive,
      accessPassword: data.value.accessPassword ?? "",
      contactsHeaderIds: data.value.settings?.contactsHeaderIds ?? [],
      contactsFooterIds: data.value.settings?.contactsFooterIds ?? [],
      metrikaCounterId: ym?.counterId ?? "",
      metrikaWebvisor: ym?.webvisor ?? false,
      metrikaClickmap: ym?.clickmap ?? true,
      metrikaTrackLinks: ym?.trackLinks ?? true,
      metrikaAccurateBounce: ym?.accurateTrackBounce ?? true,
    };
  }
});

const metrikaIdInvalid = computed(() => {
  const v = form.value.metrikaCounterId.trim();
  return v.length > 0 && !METRIKA_COUNTER_ID_REGEX.test(v);
});

function generatePassword() {
  form.value.accessPassword = randomPassword(8);
}

const contactItems = computed(() =>
  (siteContacts.value ?? []).map((c) => ({ label: c.label, value: c.id })),
);

const updateMutation = useMutation({
  mutationFn: () => {
    const counterId = form.value.metrikaCounterId.trim();
    const yandexMetrika = counterId
      ? {
          counterId,
          webvisor: form.value.metrikaWebvisor,
          clickmap: form.value.metrikaClickmap,
          trackLinks: form.value.metrikaTrackLinks,
          accurateTrackBounce: form.value.metrikaAccurateBounce,
        }
      : null;
    return $orpcClient.sites.update({
      id: id.value,
      slug: form.value.slug.trim(),
      name: form.value.name.trim(),
      customDomain: form.value.customDomain.trim() || null,
      isActive: form.value.isActive,
      accessPassword: form.value.accessPassword.trim() || null,
      settings: {
        contactsHeaderIds: form.value.contactsHeaderIds,
        contactsFooterIds: form.value.contactsFooterIds,
        analytics: { yandexMetrika },
      },
    });
  },
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

        <AppDataCard title="Доступ">
          <div class="space-y-3">
            <UFormField
              label="Сайт активен"
              description="Если выключен, посетители видят страницу «Скоро открытие»"
            >
              <USwitch v-model="form.isActive" />
            </UFormField>
            <UFormField
              label="Пароль доступа"
              description="Если задан, посетители увидят форму ввода пароля. Оставьте пустым для открытого доступа"
            >
              <div class="flex gap-2">
                <UInput
                  v-model="form.accessPassword"
                  placeholder="не задан"
                  size="sm"
                  class="flex-1"
                />
                <UButton
                  variant="outline"
                  icon="i-tabler-dice"
                  size="sm"
                  title="Сгенерировать"
                  @click="generatePassword"
                />
                <UButton
                  v-if="form.accessPassword"
                  variant="outline"
                  icon="i-tabler-x"
                  size="sm"
                  title="Очистить"
                  @click="form.accessPassword = ''"
                />
              </div>
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

        <AppDataCard title="Яндекс.Метрика">
          <template #actions>
            <a
              href="https://metrika.yandex.ru/list"
              target="_blank"
              rel="noopener"
              class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text) transition"
            >
              кабинет Метрики →
            </a>
          </template>
          <div class="space-y-3">
            <UFormField
              label="ID счётчика"
              :error="metrikaIdInvalid ? 'Только цифры (6–9 знаков)' : undefined"
              hint="Оставьте пустым, чтобы отключить счётчик на этом сайте"
            >
              <UInput
                v-model="form.metrikaCounterId"
                placeholder="12345678"
                size="sm"
                inputmode="numeric"
              />
            </UFormField>
            <div v-if="form.metrikaCounterId.trim()" class="space-y-3 border-t border-(--ui-border) pt-3">
              <UFormField label="Вебвизор" description="Запись действий пользователя">
                <USwitch v-model="form.metrikaWebvisor" />
              </UFormField>
              <UFormField label="Карта кликов">
                <USwitch v-model="form.metrikaClickmap" />
              </UFormField>
              <UFormField label="Точный показатель отказов">
                <USwitch v-model="form.metrikaAccurateBounce" />
              </UFormField>
              <UFormField label="Отслеживание внешних ссылок">
                <USwitch v-model="form.metrikaTrackLinks" />
              </UFormField>
            </div>
          </div>
        </AppDataCard>

        <AppDataCard
          v-if="form.metrikaCounterId.trim()"
          title="События для целей в Метрике"
          description="Список автоматически собирается из кода. Создайте в Метрике цели типа «JavaScript-событие» с этими именами."
        >
          <div class="space-y-4">
            <div
              v-for="group in TRACKING_EVENT_GROUPS"
              :key="group.category"
              class="space-y-2"
            >
              <div class="text-xs font-medium uppercase tracking-wide text-(--ui-text-dimmed)">
                {{ group.label }}
              </div>
              <div class="overflow-hidden rounded-lg border border-(--ui-border)">
                <table class="w-full text-xs">
                  <tbody>
                    <tr
                      v-for="g in group.items"
                      :key="g.name"
                      class="border-t border-(--ui-border) first:border-t-0"
                    >
                      <td class="px-3 py-2 font-mono text-(--ui-text) whitespace-nowrap align-top">
                        {{ g.name }}
                      </td>
                      <td class="px-3 py-2">
                        <div class="text-(--ui-text)">{{ g.title }}</div>
                        <div class="text-(--ui-text-dimmed)">{{ g.description }}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </AppDataCard>

        <div class="flex items-center gap-2 pt-1">
          <UButton
            color="primary"
            icon="i-tabler-device-floppy"
            :loading="updateMutation.isPending.value"
            :disabled="metrikaIdInvalid"
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
