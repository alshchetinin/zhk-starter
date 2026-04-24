<script setup lang="ts">
import type { ModalField } from "@zhk/api/shared/modal-fields";

const model = defineModel<ModalField[]>({ default: () => [] });

const fieldTypeOptions = [
  { label: "Имя", value: "name" },
  { label: "Телефон", value: "phone" },
  { label: "Почта", value: "email" },
  { label: "Описание", value: "description" },
  { label: "Чекбокс", value: "checkbox" },
];

function defaultItem(): ModalField {
  return {
    id: crypto.randomUUID(),
    type: "name",
    label: "Имя",
    required: true,
  };
}
</script>

<template>
  <RepeaterField v-model="model" :default-item="defaultItem">
    <template #item="{ item, update }">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Тип поля">
            <USelect
              :model-value="item.type"
              :items="fieldTypeOptions"
              @update:model-value="update('type', $event)"
            />
          </UFormField>

          <UFormField label="Обязательное">
            <USwitch
              :model-value="item.required"
              @update:model-value="update('required', $event)"
            />
          </UFormField>
        </div>

        <UFormField
          label="Название"
          :description="item.type === 'checkbox' ? 'Поддерживается HTML, например <a href=&quot;/policy&quot;>ссылка</a>' : undefined"
        >
          <UTextarea
            v-if="item.type === 'checkbox'"
            :model-value="item.label"
            :rows="2"
            placeholder="Я согласен с <a href='/policy'>политикой конфиденциальности</a>"
            @update:model-value="update('label', $event)"
          />
          <UInput
            v-else
            :model-value="item.label"
            placeholder="Название поля"
            @update:model-value="update('label', $event)"
          />
        </UFormField>

        <UFormField v-if="item.type !== 'checkbox'" label="Placeholder">
          <UInput
            :model-value="item.placeholder ?? ''"
            placeholder="Подсказка в поле"
            @update:model-value="update('placeholder', $event || undefined)"
          />
        </UFormField>

        <UFormField v-if="item.type === 'phone'" label="Маска" description="Например: +7 (###) ###-##-##">
          <UInput
            :model-value="item.mask ?? ''"
            placeholder="+7 (###) ###-##-##"
            @update:model-value="update('mask', $event || undefined)"
          />
        </UFormField>
      </div>
    </template>
  </RepeaterField>
</template>
