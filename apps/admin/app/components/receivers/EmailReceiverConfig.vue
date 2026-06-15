<script setup lang="ts">
const config = defineModel<Record<string, any>>({ required: true });
function set<K extends string>(key: K, value: unknown) {
  config.value = { ...config.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Кому (email)" required description="Адрес получателя заявок">
      <UInput :model-value="config.to" type="email" placeholder="sales@example.ru" icon="i-solar-letter-linear" class="w-full" @update:model-value="set('to', $event)" />
    </UFormField>
    <UFormField label="Тема письма" description="Необязательно — по умолчанию подставится тип заявки и сайт">
      <UInput :model-value="config.subject" placeholder="Новая заявка с сайта" class="w-full" @update:model-value="set('subject', $event)" />
    </UFormField>
  </div>
</template>
