<script setup lang="ts">
definePageMeta({ layout: "login" });

const { $authClient } = useNuxtApp();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

async function handleLogin() {
  loading.value = true;
  error.value = "";
  try {
    const result = await $authClient.signIn.email({
      email: email.value,
      password: password.value,
    });
    if (result.error) {
      error.value = result.error.message ?? "Не удалось войти";
    } else {
      navigateTo("/");
    }
  } catch (e: any) {
    error.value = e.message ?? "Не удалось войти";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="w-full max-w-sm rounded-xl border border-(--ui-border) bg-(--ui-bg) overflow-hidden"
  >
    <header class="px-5 py-4 border-b border-(--ui-border)">
      <h1 class="text-base font-semibold tracking-tight">ZHK Admin</h1>
      <p class="text-xs text-(--ui-text-dimmed) mt-0.5">Вход в админку</p>
    </header>

    <form class="flex flex-col gap-3 p-5" @submit.prevent="handleLogin">
      <UFormField label="Email">
        <UInput
          v-model="email"
          type="email"
          placeholder="admin@example.com"
          icon="i-solar-letter-linear"
          size="sm"
          required
        />
      </UFormField>
      <UFormField label="Пароль">
        <UInput
          v-model="password"
          type="password"
          placeholder="••••••••"
          icon="i-solar-lock-linear"
          size="sm"
          required
        />
      </UFormField>

      <p
        v-if="error"
        class="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-2.5 py-1.5"
      >
        {{ error }}
      </p>

      <button
        type="submit"
        :disabled="loading"
        class="mt-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-(--ui-bg-inverted) text-(--ui-text-inverted) text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
      >
        <UIcon
          v-if="loading"
          name="i-solar-refresh-linear"
          class="size-4 animate-spin"
        />
        Войти
      </button>
    </form>
  </div>
</template>
