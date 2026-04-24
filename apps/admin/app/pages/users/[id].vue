<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { permissionSections } from "~/composables/useNavigation";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient, $authClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();
const { isAdmin, me, startImpersonation } = useCurrentUser();

const id = computed(() => route.params.id as string);

const { data: userData, isPending } = useQuery(
  computed(() => ({
    ...$orpc.users.list.queryOptions(),
    select: (users: Array<{ id: string }>) => users.find((u) => u.id === id.value),
  })),
);

const { data: sitesData } = useQuery($orpc.sites.list.queryOptions());

const role = ref<"admin" | "editor">("editor");
const allowedSiteIds = ref<string[]>([]);
const allowedSections = ref<string[]>([]);
const allowedActions = ref<Array<"view" | "edit" | "publish">>([]);

const ALL_ACTIONS: Array<"view" | "edit" | "publish"> = ["view", "edit", "publish"];

const ACTION_LABELS: Record<"view" | "edit" | "publish", string> = {
  view: "Просмотр",
  edit: "Редактирование",
  publish: "Публикация",
};

watch(
  () => userData.value?.id,
  (newId) => {
    if (!newId || !userData.value) return;
    role.value = (userData.value.role as "admin" | "editor") ?? "editor";
    const p = (userData.value.permissions ?? {}) as {
      siteIds?: string[];
      sections?: string[];
      actions?: Array<"view" | "edit" | "publish">;
    };
    allowedSiteIds.value = [...(p.siteIds ?? [])];
    allowedSections.value = [...(p.sections ?? [])];
    allowedActions.value = [...(p.actions ?? ["view"])];
  },
  { immediate: true },
);

const roleMutation = useMutation({
  mutationFn: () => $orpcClient.users.updateRole({ id: id.value, role: role.value }),
  onSuccess: () => {
    toast.add({ title: "Роль обновлена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.users.key() });
  },
});

const banMutation = useMutation({
  mutationFn: async () => {
    const isBanned = userData.value?.banned;
    const res = isBanned
      ? await $authClient.admin.unbanUser({ userId: id.value })
      : await $authClient.admin.banUser({ userId: id.value });
    if (res.error) throw new Error(res.error.message);
    return !isBanned;
  },
  onSuccess: (nowBanned) => {
    toast.add({
      title: nowBanned ? "Пользователь заблокирован" : "Пользователь разблокирован",
      color: "success",
    });
    queryClient.invalidateQueries({ queryKey: $orpc.users.key() });
  },
  onError: (e) => {
    toast.add({ title: "Ошибка", description: e.message, color: "error" });
  },
});

const permissionsMutation = useMutation({
  mutationFn: () =>
    $orpcClient.users.updatePermissions({
      id: id.value,
      permissions: {
        siteIds: allowedSiteIds.value,
        sections: allowedSections.value,
        actions: allowedActions.value,
      },
    }),
  onSuccess: () => {
    toast.add({ title: "Права сохранены", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.users.key() });
  },
});

function toggle<T>(list: T[], value: T) {
  const i = list.indexOf(value);
  if (i >= 0) list.splice(i, 1);
  else list.push(value);
}

function onSaveRole() {
  roleMutation.mutate();
}

function onSavePermissions() {
  permissionsMutation.mutate();
}
</script>

<template>
  <PageContainer>
    <div v-if="!isAdmin" class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-8 text-center">
      <UIcon name="i-tabler-shield-lock" class="size-12 mx-auto text-(--ui-text-muted)" />
      <p class="mt-3 text-(--ui-text-muted)">Раздел доступен только администраторам</p>
    </div>

    <template v-else>
      <div class="mb-6 flex items-center gap-3">
        <UButton variant="ghost" icon="i-tabler-arrow-left" @click="router.push('/users')" />
        <h1 class="text-2xl font-bold">{{ userData?.name ?? "Пользователь" }}</h1>
        <UButton
          v-if="userData && userData.role === 'editor' && userData.id !== me?.id"
          variant="outline"
          icon="i-tabler-eye"
          class="ml-auto rounded-xl"
          @click="startImpersonation(userData.id)"
        >
          Посмотреть глазами редактора
        </UButton>
      </div>

      <div v-if="isPending" class="text-(--ui-text-muted)">Загрузка…</div>

      <div v-else-if="userData" class="max-w-2xl flex flex-col gap-6">
        <section class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6">
          <h3 class="text-lg font-semibold mb-4">Роль</h3>
          <URadioGroup
            v-model="role"
            :items="[
              { value: 'admin', label: 'Admin — полный доступ ко всему' },
              { value: 'editor', label: 'Editor — доступ ограничен правами ниже' },
            ]"
          />
          <button
            type="button"
            class="mt-4 text-sm font-medium px-4 py-2 rounded-xl bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) disabled:opacity-60"
            :disabled="roleMutation.isPending.value"
            @click="onSaveRole"
          >
            {{ roleMutation.isPending.value ? "Сохранение…" : "Сохранить роль" }}
          </button>
        </section>

        <section v-if="role === 'editor'" class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 flex flex-col gap-5">
          <h3 class="text-lg font-semibold">Права редактора</h3>

          <div>
            <h4 class="text-sm font-medium mb-2">Разрешённые сайты</h4>
            <p class="text-xs text-(--ui-text-muted) mb-3">Пусто = все сайты</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="s in (sitesData ?? [])"
                :key="s.id"
                type="button"
                class="text-xs font-medium px-3 py-1.5 rounded-md transition-colors select-none"
                :class="allowedSiteIds.includes(s.id)
                  ? 'bg-(--ui-bg-inverted) text-(--ui-text-inverted)'
                  : 'ring ring-inset ring-(--ui-border-accented) text-(--ui-text) bg-(--ui-bg-elevated) hover:bg-(--ui-bg-muted)'"
                @click="toggle(allowedSiteIds, s.id)"
              >
                {{ s.name }}
              </button>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-medium mb-2">Разрешённые разделы</h4>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="sec in permissionSections"
                :key="sec.id"
                type="button"
                class="text-xs font-medium px-3 py-1.5 rounded-md transition-colors select-none"
                :class="allowedSections.includes(sec.id)
                  ? 'bg-(--ui-bg-inverted) text-(--ui-text-inverted)'
                  : 'ring ring-inset ring-(--ui-border-accented) text-(--ui-text) bg-(--ui-bg-elevated) hover:bg-(--ui-bg-muted)'"
                @click="toggle(allowedSections, sec.id)"
              >
                {{ sec.label }}
              </button>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-medium mb-2">Действия</h4>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="a in ALL_ACTIONS"
                :key="a"
                type="button"
                class="text-xs font-medium px-3 py-1.5 rounded-md transition-colors select-none"
                :class="allowedActions.includes(a)
                  ? 'bg-(--ui-bg-inverted) text-(--ui-text-inverted)'
                  : 'ring ring-inset ring-(--ui-border-accented) text-(--ui-text) bg-(--ui-bg-elevated) hover:bg-(--ui-bg-muted)'"
                @click="toggle(allowedActions, a)"
              >
                {{ ACTION_LABELS[a] }}
              </button>
            </div>
          </div>

          <div>
            <button
              type="button"
              class="text-sm font-medium px-4 py-2 rounded-xl bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) disabled:opacity-60"
              :disabled="permissionsMutation.isPending.value"
              @click="onSavePermissions"
            >
              {{ permissionsMutation.isPending.value ? "Сохранение…" : "Сохранить права" }}
            </button>
          </div>
        </section>

        <section
          v-if="userData.id !== me?.id"
          class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 flex items-center justify-between gap-4"
        >
          <div>
            <h3 class="text-lg font-semibold">
              {{ userData.banned ? "Пользователь заблокирован" : "Статус доступа" }}
            </h3>
            <p class="text-sm text-(--ui-text-muted) mt-1">
              {{ userData.banned
                ? "Пользователь не сможет войти, пока вы его не разблокируете."
                : "Блокировка запретит вход, но сохранит историю и контент пользователя." }}
            </p>
          </div>
          <UButton
            :color="userData.banned ? 'primary' : 'error'"
            variant="outline"
            :icon="userData.banned ? 'i-tabler-lock-open' : 'i-tabler-lock'"
            class="rounded-xl shrink-0"
            :loading="banMutation.isPending.value"
            @click="banMutation.mutate()"
          >
            {{ userData.banned ? "Разблокировать" : "Заблокировать" }}
          </UButton>
        </section>
      </div>
    </template>
  </PageContainer>
</template>
