<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data, isPending: loading } = useQuery(
  $orpc.ticketSettings.get.queryOptions(),
);

const form = reactive({
  telegramBotToken: "",
  telegramChatId: "",
});

whenever(data, (val) => {
  if (!val) return;
  form.telegramBotToken = val.telegramBotToken ?? "";
  form.telegramChatId = val.telegramChatId ?? "";
}, { once: true, immediate: true });

const saveMutation = useMutation({
  mutationFn: () =>
    $orpcClient.ticketSettings.save({
      telegramBotToken: form.telegramBotToken.trim() || undefined,
      telegramChatId: form.telegramChatId.trim() || undefined,
    }),
  onSuccess: () => {
    toast.add({ title: "Настройки сохранены", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.ticketSettings.key() });
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
        <div class="flex items-center gap-3">
          <NuxtLink to="/tickets">
            <UButton variant="ghost" icon="i-tabler-arrow-left" size="sm" />
          </NuxtLink>
          <div>
            <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">
              Настройки заявок
            </h1>
            <p class="text-(--ui-text-muted) text-sm mt-1">
              Куда отправлять уведомления о новых заявках
            </p>
          </div>
        </div>
        <UButton
          :loading="saveMutation.isPending.value"
          icon="i-tabler-device-floppy"
          class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
          @click="saveMutation.mutate()"
        >
          Сохранить
        </UButton>
      </div>

      <div class="max-w-2xl space-y-6">
        <!-- Telegram -->
        <div class="rounded-xl border border-(--ui-border) p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <UIcon name="i-tabler-brand-telegram" class="text-blue-500 text-xl" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">Telegram</h2>
              <p class="text-sm text-(--ui-text-muted)">Уведомления в Telegram-чат</p>
            </div>
          </div>

          <UFormField label="Bot Token" description="Токен бота из @BotFather">
            <UInput
              v-model="form.telegramBotToken"
              placeholder="123456:ABC-DEF..."
              icon="i-tabler-key"
              size="xl"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Chat ID" description="ID чата или группы для уведомлений. Узнать: отправьте боту сообщение, затем откройте https://api.telegram.org/bot{TOKEN}/getUpdates">
            <UInput
              v-model="form.telegramChatId"
              placeholder="-1001234567890"
              icon="i-tabler-message"
              size="xl"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
