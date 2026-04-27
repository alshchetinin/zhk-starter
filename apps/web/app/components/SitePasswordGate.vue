<script setup lang="ts">
defineProps<{ siteName: string }>();

const password = ref("");
const error = ref<string | null>(null);
const loading = ref(false);

async function submit() {
  if (!password.value.trim() || loading.value) return;
  loading.value = true;
  error.value = null;
  try {
    await $fetch("/api/site/unlock", {
      method: "POST",
      body: { password: password.value },
    });
    if (import.meta.client) window.location.reload();
  } catch (e) {
    const message =
      (e as { data?: { message?: string }; statusMessage?: string })?.data
        ?.message ??
      (e as { statusMessage?: string })?.statusMessage ??
      "";
    error.value =
      message === "WRONG_PASSWORD"
        ? "Неверный пароль"
        : "Не удалось разблокировать сайт";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="min-h-svh flex flex-col items-center justify-center px-6"
    style="background: var(--web-bg-base, #fff); color: var(--web-text-primary, #111)"
  >
    <form
      class="w-full max-w-sm space-y-5 text-center"
      @submit.prevent="submit"
    >
      <div
        class="size-14 mx-auto rounded-2xl flex items-center justify-center"
        style="background: var(--web-bg-muted, #f4f4f5); color: var(--web-accent, #6366f1)"
      >
        <Icon name="lucide:lock" class="size-7" />
      </div>
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight">{{ siteName }}</h1>
        <p class="text-sm opacity-70">
          Сайт пока закрыт паролем. Введите пароль доступа.
        </p>
      </div>
      <div class="space-y-2 text-left">
        <input
          v-model="password"
          type="password"
          autofocus
          autocomplete="current-password"
          placeholder="Пароль"
          class="w-full px-4 py-2.5 rounded-lg border outline-none transition focus:ring-2"
          style="
            background: var(--web-bg-base, #fff);
            border-color: var(--web-border, #e4e4e7);
            color: var(--web-text-primary, #111);
          "
        />
        <p v-if="error" class="text-xs text-red-500 px-1">{{ error }}</p>
      </div>
      <button
        type="submit"
        :disabled="!password.trim() || loading"
        class="w-full py-2.5 rounded-lg font-medium transition disabled:opacity-50"
        style="
          background: var(--web-accent, #6366f1);
          color: var(--web-on-accent, #fff);
        "
      >
        {{ loading ? "Проверяем…" : "Войти" }}
      </button>
    </form>
  </div>
</template>
