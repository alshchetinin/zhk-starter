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
  form.password = randomPassword(16);
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
    <div
      v-if="isLoading"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <AppEmptyState
      v-else-if="!isAdmin"
      icon="i-tabler-shield-lock"
      title="Только для администраторов"
      description="У вас нет прав на просмотр этой страницы."
    />

    <template v-else>
      <AppPageHeader
        title="Пользователи"
        subtitle="Управление ролями и правами"
      >
        <template #actions>
          <UButton
            icon="i-tabler-user-plus"
            color="primary"
            @click="isCreateOpen = true"
          >
            Добавить пользователя
          </UButton>
        </template>
      </AppPageHeader>

      <div
        v-if="isPending"
        class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
      >
        <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
        Загрузка…
      </div>

      <AppDataCard v-else-if="data?.length" flush>
        <div class="divide-y divide-(--ui-border)">
          <NuxtLink
            v-for="u in data"
            :key="u.id"
            :to="`/users/${u.id}`"
            class="group flex items-center gap-3 px-4 py-3 hover:bg-(--ui-bg-elevated) transition"
          >
            <UAvatar :alt="u.name ?? 'U'" size="sm" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold truncate">{{ u.name }}</span>
                <AppStatusPill
                  :tone="u.role === 'admin' ? 'info' : 'muted'"
                  :label="u.role === 'admin' ? 'Admin' : 'Editor'"
                />
                <AppStatusPill v-if="u.banned" tone="error" label="Banned" dot />
              </div>
              <div class="text-[11px] text-(--ui-text-dimmed) truncate mt-0.5">
                {{ u.email }}
              </div>
            </div>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-4 text-(--ui-text-dimmed) opacity-0 group-hover:opacity-100 transition shrink-0"
            />
          </NuxtLink>
        </div>
      </AppDataCard>

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
                  variant="outline"
                  icon="i-tabler-refresh"
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
              :disabled="createMutation.isPending.value"
              @click="isCreateOpen = false"
            >
              Отмена
            </UButton>
            <UButton
              color="primary"
              :loading="createMutation.isPending.value"
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
