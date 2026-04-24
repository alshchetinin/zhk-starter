<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $authClient } = useNuxtApp();
const router = useRouter();
const toast = useToast();
const queryClient = useQueryClient();
const { isAdmin, isLoading } = useCurrentUser();

const { data, isPending } = useQuery($orpc.users.list.queryOptions());

const isCreateOpen = ref(false);
const form = reactive({
  email: "",
  name: "",
  password: "",
  role: "editor" as "admin" | "editor",
});
function resetForm() {
  form.email = "";
  form.name = "";
  form.password = "";
  form.role = "editor";
}

function generatePassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const arr = new Uint32Array(16);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 16; i++) out += chars[arr[i]! % chars.length];
  form.password = out;
}

const createMutation = useMutation({
  mutationFn: async () => {
    const res = await $authClient.admin.createUser({
      email: form.email,
      name: form.name,
      password: form.password,
      role: form.role,
    });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: $orpc.users.key() });
    toast.add({ title: "Пользователь создан", color: "success" });
    isCreateOpen.value = false;
    const newId = data?.user?.id;
    resetForm();
    if (newId) router.push(`/users/${newId}`);
  },
  onError: (e) => {
    toast.add({ title: "Ошибка", description: e.message, color: "error" });
  },
});

function onSubmit() {
  if (!form.email || !form.name || !form.password) {
    toast.add({ title: "Заполните все поля", color: "error" });
    return;
  }
  createMutation.mutate();
}
</script>

<template>
  <PageContainer>
    <div v-if="isLoading" class="text-(--ui-text-muted)">Загрузка…</div>

    <div v-else-if="!isAdmin" class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-8 text-center">
      <UIcon name="i-tabler-shield-lock" class="size-12 mx-auto text-(--ui-text-muted)" />
      <p class="mt-3 text-(--ui-text-muted)">Раздел доступен только администраторам</p>
    </div>

    <template v-else>
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Пользователи</h1>
          <p class="text-sm text-(--ui-text-muted) mt-1">
            Управление ролями и правами доступа редакторов
          </p>
        </div>
        <UButton
          icon="i-tabler-user-plus"
          class="rounded-xl"
          @click="isCreateOpen = true"
        >
          Добавить пользователя
        </UButton>
      </div>

      <div v-if="isPending" class="text-(--ui-text-muted)">Загрузка…</div>

      <div v-else-if="data?.length" class="grid grid-cols-1 gap-3">
        <NuxtLink
          v-for="u in data"
          :key="u.id"
          :to="`/users/${u.id}`"
          class="flex gap-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 hover:shadow-md transition-shadow"
        >
          <UAvatar :alt="u.name ?? 'U'" size="md" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-semibold truncate">{{ u.name }}</span>
              <UBadge
                :color="u.role === 'admin' ? 'primary' : 'neutral'"
                variant="subtle"
              >
                {{ u.role === 'admin' ? 'Admin' : 'Editor' }}
              </UBadge>
              <UBadge v-if="u.banned" color="error" variant="subtle">Banned</UBadge>
            </div>
            <div class="text-xs text-(--ui-text-dimmed) mt-1">{{ u.email }}</div>
          </div>
        </NuxtLink>
      </div>

      <UModal
        :open="isCreateOpen"
        title="Новый пользователь"
        @update:open="(v) => { isCreateOpen = v; if (!v) resetForm() }"
      >
        <template #body>
          <div class="flex flex-col gap-4">
            <UFormField label="Email" required>
              <UInput v-model="form.email" type="email" placeholder="user@example.com" class="w-full" autocomplete="off" />
            </UFormField>
            <UFormField label="Имя" required>
              <UInput v-model="form.name" placeholder="Иван Иванов" class="w-full" autocomplete="off" />
            </UFormField>
            <UFormField label="Пароль" required>
              <div class="flex gap-2">
                <UInput v-model="form.password" type="text" placeholder="Минимум 8 символов" class="flex-1" autocomplete="new-password" />
                <UButton
                  type="button"
                  variant="outline"
                  icon="i-tabler-refresh"
                  class="rounded-xl"
                  @click="generatePassword"
                >
                  Сгенерировать
                </UButton>
              </div>
            </UFormField>
            <UFormField label="Роль">
              <URadioGroup
                v-model="form.role"
                :items="[
                  { value: 'editor', label: 'Editor — доступ по правам' },
                  { value: 'admin', label: 'Admin — полный доступ' },
                ]"
              />
            </UFormField>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              variant="outline"
              class="rounded-xl"
              :disabled="createMutation.isPending.value"
              @click="isCreateOpen = false"
            >
              Отмена
            </UButton>
            <UButton
              :loading="createMutation.isPending.value"
              class="rounded-xl"
              @click="onSubmit"
            >
              Создать
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </PageContainer>
</template>
