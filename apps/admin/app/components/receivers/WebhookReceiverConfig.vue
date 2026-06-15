<script setup lang="ts">
const config = defineModel<Record<string, any>>({ required: true });
function set<K extends string>(key: K, value: unknown) {
  config.value = { ...config.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="URL" required description="Куда слать POST с JSON заявки">
      <UInput :model-value="config.url" placeholder="https://example.com/webhook" class="w-full" @update:model-value="set('url', $event)" />
    </UFormField>
    <UFormField label="Метод">
      <USelect :model-value="config.method ?? 'POST'" :items="['POST', 'PUT']" @update:model-value="set('method', $event)" />
    </UFormField>
    <UFormField label="Секрет подписи" description="Если задан — шлём заголовок X-Signature (HMAC-SHA256 тела)">
      <UInput :model-value="config.secret" type="password" placeholder="необязательно" class="w-full" @update:model-value="set('secret', $event)" />
    </UFormField>
  </div>
</template>
