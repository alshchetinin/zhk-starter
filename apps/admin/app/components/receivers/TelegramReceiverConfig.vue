<script setup lang="ts">
const config = defineModel<Record<string, any>>({ required: true });
function set<K extends string>(key: K, value: unknown) {
  config.value = { ...config.value, [key]: value };
}
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Bot Token" required description="Токен бота из @BotFather">
      <UInput :model-value="config.botToken" placeholder="123456:ABC-DEF..." icon="i-solar-key-linear" class="w-full" @update:model-value="set('botToken', $event)" />
    </UFormField>
    <UFormField label="Chat ID" required description="ID чата/группы. Узнать: напишите боту, откройте https://api.telegram.org/bot{TOKEN}/getUpdates">
      <UInput :model-value="config.chatId" placeholder="-1001234567890" icon="i-solar-chat-square-linear" class="w-full" @update:model-value="set('chatId', $event)" />
    </UFormField>
  </div>
</template>
