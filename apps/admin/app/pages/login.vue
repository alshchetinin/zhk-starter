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
      error.value = result.error.message ?? "Login failed";
    } else {
      navigateTo("/");
    }
  } catch (e: any) {
    error.value = e.message ?? "Login failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UCard class="w-full max-w-sm">
    <template #header>
      <h1 class="text-xl font-bold">ZHK Admin</h1>
      <p class="text-sm text-gray-500">Sign in to your account</p>
    </template>

    <form class="flex flex-col gap-4" @submit.prevent="handleLogin">
      <UFormField label="Email">
        <UInput v-model="email" type="email" placeholder="admin@example.com" required />
      </UFormField>

      <UFormField label="Password">
        <UInput v-model="password" type="password" placeholder="Password" required />
      </UFormField>

      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

      <UButton type="submit" block :loading="loading">Sign In</UButton>
    </form>
  </UCard>
</template>
