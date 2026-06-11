<script setup lang="ts">
import { SOCIAL_TYPE_OPTIONS, type SocialLinkType } from "@zhk/api/shared/socials";

export type ContactSocial = {
  type: SocialLinkType;
  link: string;
};

export type ContactFormValue = {
  label: string;
  phone: string;
  email: string;
  address: string;
  workingHours: string;
  coordinates: string;
  mapLink: string;
  image: string | null;
  socials: ContactSocial[];
  tags: string[];
  sortOrder: number;
};

const model = defineModel<ContactFormValue>({ required: true });

function set<K extends keyof ContactFormValue>(key: K, value: ContactFormValue[K]) {
  model.value = { ...model.value, [key]: value };
}
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <div class="border border-(--ui-border) p-6 space-y-4">
      <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Основное</h2>

      <UFormField label="Название записи" required hint="Внутреннее имя, например «Отдел продаж — Казань» или «Главный офис»">
        <UInput :model-value="model.label" size="xl" class="w-full" @update:model-value="(v) => set('label', v as string)" />
      </UFormField>

      <UFormField label="Теги" description="Свободные метки для группировки и выбора на сайтах">
        <TagInput :model-value="model.tags" @update:model-value="(v) => set('tags', v)" />
      </UFormField>

      <UFormField label="Порядок сортировки">
        <UInput
          :model-value="model.sortOrder"
          type="number"
          size="xl"
          class="w-full"
          @update:model-value="(v) => set('sortOrder', Number(v) || 0)"
        />
      </UFormField>
    </div>

    <div class="border border-(--ui-border) p-6 space-y-4">
      <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Контактная информация</h2>

      <UFormField label="Телефон">
        <UInput :model-value="model.phone" placeholder="+7 (999) 123-45-67" icon="i-solar-phone-linear" size="xl" class="w-full" @update:model-value="(v) => set('phone', v as string)" />
      </UFormField>

      <UFormField label="Email">
        <UInput :model-value="model.email" placeholder="info@company.ru" icon="i-solar-letter-linear" size="xl" class="w-full" @update:model-value="(v) => set('email', v as string)" />
      </UFormField>

      <UFormField label="Адрес">
        <UInput :model-value="model.address" placeholder="г. Москва, ул. Примерная, д. 1" icon="i-solar-map-point-linear" size="xl" class="w-full" @update:model-value="(v) => set('address', v as string)" />
      </UFormField>

      <UFormField label="Часы работы">
        <UInput :model-value="model.workingHours" placeholder="Пн-Пт 9:00-18:00" icon="i-solar-clock-circle-linear" size="xl" class="w-full" @update:model-value="(v) => set('workingHours', v as string)" />
      </UFormField>

      <UFormField label="Фото">
        <ImageUpload :model-value="model.image" folder="contacts" @update:model-value="(v) => set('image', v ?? null)" />
      </UFormField>
    </div>

    <div class="border border-(--ui-border) p-6 space-y-4">
      <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Карта</h2>

      <YandexMapPicker :model-value="model.coordinates" @update:model-value="(v) => set('coordinates', v as string)" />

      <UFormField label="Ссылка на карту" description="Альтернатива координатам — прямая ссылка">
        <UInput :model-value="model.mapLink" placeholder="https://yandex.ru/maps/..." icon="i-solar-link-linear" size="xl" class="w-full" @update:model-value="(v) => set('mapLink', v as string)" />
      </UFormField>
    </div>

    <div class="border border-(--ui-border) p-6 space-y-4">
      <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Свои соцсети</h2>
      <p class="text-sm text-(--ui-text-muted) -mt-2">
        Если оставить пустым — используются общие соцсети компании или сайта.
      </p>

      <RepeaterField
        :model-value="model.socials"
        :default-item="() => ({ type: 'telegram', link: '' })"
        :max="10"
        @update:model-value="(v) => set('socials', v as ContactSocial[])"
      >
        <template #item="{ item, update }">
          <div class="space-y-3">
            <UFormField label="Соцсеть" required>
              <USelect
                :model-value="item.type"
                :items="SOCIAL_TYPE_OPTIONS"
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
  </div>
</template>
