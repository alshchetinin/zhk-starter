<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data, isPending: loading } = useQuery(
  $orpc.contacts.get.queryOptions(),
);

const form = reactive({
  phone: "",
  email: "",
  address: "",
  workingHours: "",
  coordinates: "",
  mapLink: "",
  location: "",
  socials: [] as Array<{ type: string; link: string }>,
  offices: [] as Array<{
    title: string;
    address: string;
    phone: string;
    email: string;
    workingHours: string;
    coordinates: string;
    image: string;
  }>,
});

whenever(data, (val) => {
  if (!val) return;
  form.phone = val.phone ?? "";
  form.email = val.email ?? "";
  form.address = val.address ?? "";
  form.workingHours = val.workingHours ?? "";
  form.coordinates = val.coordinates ?? "";
  form.mapLink = val.mapLink ?? "";
  form.location = val.location ?? "";
  form.socials = (val.socials as typeof form.socials) ?? [];
  form.offices = (val.offices as typeof form.offices) ?? [];
}, { once: true, immediate: true });

const socialTypeOptions = [
  { label: "VK", value: "vk" },
  { label: "Telegram", value: "telegram" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Одноклассники", value: "ok" },
  { label: "YouTube", value: "youtube" },
  { label: "Дзен", value: "dzen" },
];

const canSave = computed(() => form.phone.trim().length > 0 && form.address.trim().length > 0);

const saveMutation = useMutation({
  mutationFn: () =>
    $orpcClient.contacts.save({
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      address: form.address.trim(),
      workingHours: form.workingHours.trim() || undefined,
      coordinates: form.coordinates.trim() || undefined,
      mapLink: form.mapLink.trim() || undefined,
      location: form.location.trim() || undefined,
      socials: form.socials.filter((s) => s.link.trim()),
      offices: form.offices.filter((o) => o.title.trim() && o.address.trim()),
    }),
  onSuccess: () => {
    toast.add({ title: "Контакты сохранены", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.contacts.key() });
  },
  onError: () => {
    toast.add({ title: "Ошибка сохранения", color: "error" });
  },
});
</script>

<template>
  <PageContainer>
    <div v-if="loading" class="flex justify-center py-20">
      <UIcon name="i-tabler-loader-2" class="animate-spin text-3xl" />
    </div>

    <template v-else>
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">
            Контакты
          </h1>
          <p class="text-(--ui-text-muted) text-sm mt-1">
            Основные контактные данные компании
          </p>
        </div>
        <UButton
          :disabled="!canSave"
          :loading="saveMutation.isPending.value"
          icon="i-tabler-device-floppy"
          class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
          @click="saveMutation.mutate()"
        >
          Сохранить
        </UButton>
      </div>

      <div class="max-w-2xl space-y-6">
        <!-- Основная информация -->
        <div class="rounded-xl border border-(--ui-border) p-6 space-y-4">
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
            Основная информация
          </h2>

          <UFormField label="Телефон" required>
            <UInput
              v-model="form.phone"
              placeholder="+7 (999) 123-45-67"
              icon="i-tabler-phone"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Email">
            <UInput
              v-model="form.email"
              placeholder="info@company.ru"
              icon="i-tabler-mail"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Адрес" required>
            <UInput
              v-model="form.address"
              placeholder="г. Москва, ул. Примерная, д. 1"
              icon="i-tabler-map-pin"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Город / район">
            <UInput
              v-model="form.location"
              placeholder="Москва"
              icon="i-tabler-building-community"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Часы работы">
            <UInput
              v-model="form.workingHours"
              placeholder="Пн-Пт 9:00-18:00"
              icon="i-tabler-clock"
              size="xl"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Карта -->
        <div class="rounded-xl border border-(--ui-border) p-6 space-y-4">
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
            Карта
          </h2>

          <YandexMapPicker v-model="form.coordinates" />

          <UFormField label="Ссылка на карту" description="Альтернатива координатам — прямая ссылка на карту">
            <UInput
              v-model="form.mapLink"
              placeholder="https://yandex.ru/maps/..."
              icon="i-tabler-link"
              size="xl"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Соцсети -->
        <div class="rounded-xl border border-(--ui-border) p-6 space-y-4">
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
            Социальные сети
          </h2>

          <RepeaterField
            v-model="form.socials"
            :default-item="() => ({ type: 'telegram', link: '' })"
            :max="10"
          >
            <template #item="{ item, update }">
              <div class="space-y-3">
                <UFormField label="Соцсеть" required>
                  <USelect
                    :model-value="item.type"
                    :items="socialTypeOptions"
                    class="w-full"
                    @update:model-value="update('type', $event)"
                  />
                </UFormField>
                <UFormField label="Ссылка" required>
                  <UInput
                    :model-value="item.link"
                    placeholder="https://..."
                    @update:model-value="update('link', $event)"
                  />
                </UFormField>
              </div>
            </template>
          </RepeaterField>
        </div>

        <!-- Офисы продаж -->
        <div class="rounded-xl border border-(--ui-border) p-6 space-y-4">
          <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
            Офисы продаж
          </h2>

          <RepeaterField
            v-model="form.offices"
            :default-item="() => ({ title: '', address: '', phone: '', email: '', workingHours: '', coordinates: '', image: '' })"
            :max="10"
          >
            <template #item="{ item, update }">
              <div class="space-y-3">
                <UFormField label="Название" required>
                  <UInput
                    :model-value="item.title"
                    placeholder="Офис продаж на Примерной"
                    @update:model-value="update('title', $event)"
                  />
                </UFormField>
                <UFormField label="Адрес" required>
                  <UInput
                    :model-value="item.address"
                    placeholder="г. Москва, ул. Примерная, д. 1"
                    @update:model-value="update('address', $event)"
                  />
                </UFormField>
                <div class="grid grid-cols-2 gap-3">
                  <UFormField label="Телефон">
                    <UInput
                      :model-value="item.phone"
                      placeholder="+7 (999) 123-45-67"
                      @update:model-value="update('phone', $event)"
                    />
                  </UFormField>
                  <UFormField label="Email">
                    <UInput
                      :model-value="item.email"
                      placeholder="office@company.ru"
                      @update:model-value="update('email', $event)"
                    />
                  </UFormField>
                </div>
                <UFormField label="Часы работы">
                  <UInput
                    :model-value="item.workingHours"
                    placeholder="Пн-Пт 9:00-18:00"
                    @update:model-value="update('workingHours', $event)"
                  />
                </UFormField>
                <UFormField label="Координаты" description="Широта и долгота через запятую">
                  <UInput
                    :model-value="item.coordinates"
                    placeholder="55.7558, 37.6173"
                    @update:model-value="update('coordinates', $event)"
                  />
                </UFormField>
                <UFormField label="Фото офиса">
                  <ImageUpload
                    :model-value="item.image || null"
                    folder="contacts/offices"
                    @update:model-value="update('image', $event ?? '')"
                  />
                </UFormField>
              </div>
            </template>
          </RepeaterField>
        </div>

      </div>
    </template>
  </PageContainer>
</template>
