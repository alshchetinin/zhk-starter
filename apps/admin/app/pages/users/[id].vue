<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { permissionSections } from "~/composables/useNavigation";

const route = useRoute();
const { $orpc, $orpcClient, $authClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();
const { isAdmin, me, startImpersonation } = useCurrentUser();

const id = computed(() => route.params.id as string);

const { data: userData, isPending } = useQuery(
  computed(() => ({
    ...$orpc.users.list.queryOptions(),
    select: (users: Array<{ id: string }>) =>
      users.find((u) => u.id === id.value),
  })),
);

const { data: sitesData } = useQuery($orpc.sites.list.queryOptions());

const role = ref<"admin" | "editor">("editor");
const allowedSiteIds = ref<string[]>([]);
const allowedSections = ref<string[]>([]);
const allowedActions = ref<Array<"view" | "edit" | "publish">>([]);

const ALL_ACTIONS: Array<"view" | "edit" | "publish"> = [
  "view",
  "edit",
  "publish",
];

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
  mutationFn: () =>
    $orpcClient.users.updateRole({ id: id.value, role: role.value }),
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
      title: nowBanned
        ? "Пользователь заблокирован"
        : "Пользователь разблокирован",
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
</script>

<template>
  <PageContainer>
    <AppEmptyState
      v-if="!isAdmin"
      icon="i-solar-shield-keyhole-linear"
      title="Только для администраторов"
      description="У вас нет прав на просмотр этой страницы."
    />

    <template v-else>
      <AppPageHeader
        :title="userData?.name ?? 'Пользователь'"
        back="/users"
        :crumbs="[
          { label: 'Пользователи', to: '/users' },
          { label: userData?.name ?? '…' },
        ]"
      >
        <template #actions>
          <AppStatusPill
            v-if="userData"
            :tone="userData.role === 'admin' ? 'info' : 'muted'"
            :label="userData.role === 'admin' ? 'Admin' : 'Editor'"
          />
          <AppStatusPill
            v-if="userData?.banned"
            tone="error"
            label="Banned"
            dot
          />
          <UButton
            v-if="userData && userData.role === 'editor' && userData.id !== me?.id"
            icon="i-solar-eye-linear"
            variant="outline"
            @click="startImpersonation(userData.id)"
          >
            Глазами редактора
          </UButton>
        </template>
      </AppPageHeader>

      <div
        v-if="isPending"
        class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
      >
        <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
        Загрузка…
      </div>

      <div v-else-if="userData" class="max-w-2xl space-y-3">
        <!-- Role -->
        <AppDataCard title="Роль">
          <URadioGroup
            v-model="role"
            :items="[
              { value: 'admin', label: 'Admin — полный доступ ко всему' },
              { value: 'editor', label: 'Editor — доступ ограничен правами' },
            ]"
          />
          <div class="mt-4">
            <UButton
              color="primary"
              icon="i-solar-diskette-linear"
              :loading="roleMutation.isPending.value"
              @click="roleMutation.mutate()"
            >
              Сохранить роль
            </UButton>
          </div>
        </AppDataCard>

        <!-- Permissions -->
        <AppDataCard v-if="role === 'editor'" title="Права редактора">
          <div class="space-y-5">
            <div>
              <h4 class="text-xs font-medium text-(--ui-text) mb-1">
                Разрешённые сайты
              </h4>
              <p class="text-[11px] text-(--ui-text-dimmed) mb-2">
                Пусто = все сайты
              </p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="s in sitesData ?? []"
                  :key="s.id"
                  type="button"
                  class="text-[11px] font-medium px-2.5 py-1 rounded-md transition select-none border"
                  :class="
                    allowedSiteIds.includes(s.id)
                      ? 'bg-(--ui-bg-inverted) text-(--ui-text-inverted) border-(--ui-bg-inverted)'
                      : 'border-(--ui-border) text-(--ui-text-muted) hover:text-(--ui-text) hover:bg-(--ui-bg-elevated)'
                  "
                  @click="toggle(allowedSiteIds, s.id)"
                >
                  {{ s.name }}
                </button>
              </div>
            </div>

            <div>
              <h4 class="text-xs font-medium text-(--ui-text) mb-2">
                Разрешённые разделы
              </h4>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="sec in permissionSections"
                  :key="sec.id"
                  type="button"
                  class="text-[11px] font-medium px-2.5 py-1 rounded-md transition select-none border"
                  :class="
                    allowedSections.includes(sec.id)
                      ? 'bg-(--ui-bg-inverted) text-(--ui-text-inverted) border-(--ui-bg-inverted)'
                      : 'border-(--ui-border) text-(--ui-text-muted) hover:text-(--ui-text) hover:bg-(--ui-bg-elevated)'
                  "
                  @click="toggle(allowedSections, sec.id)"
                >
                  {{ sec.label }}
                </button>
              </div>
            </div>

            <div>
              <h4 class="text-xs font-medium text-(--ui-text) mb-2">
                Действия
              </h4>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="a in ALL_ACTIONS"
                  :key="a"
                  type="button"
                  class="text-[11px] font-medium px-2.5 py-1 rounded-md transition select-none border"
                  :class="
                    allowedActions.includes(a)
                      ? 'bg-(--ui-bg-inverted) text-(--ui-text-inverted) border-(--ui-bg-inverted)'
                      : 'border-(--ui-border) text-(--ui-text-muted) hover:text-(--ui-text) hover:bg-(--ui-bg-elevated)'
                  "
                  @click="toggle(allowedActions, a)"
                >
                  {{ ACTION_LABELS[a] }}
                </button>
              </div>
            </div>

            <div class="pt-1">
              <UButton
                color="primary"
                icon="i-solar-diskette-linear"
                :loading="permissionsMutation.isPending.value"
                @click="permissionsMutation.mutate()"
              >
                Сохранить права
              </UButton>
            </div>
          </div>
        </AppDataCard>

        <!-- Ban / Unban -->
        <AppDataCard
          v-if="userData.id !== me?.id"
          :title="userData.banned ? 'Пользователь заблокирован' : 'Доступ'"
        >
          <div class="flex items-start gap-4 justify-between">
            <p class="text-xs text-(--ui-text-muted)">
              {{
                userData.banned
                  ? "Пользователь не сможет войти, пока вы его не разблокируете."
                  : "Блокировка запретит вход, но сохранит историю и контент."
              }}
            </p>
            <button
              class="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition disabled:opacity-40 shrink-0 border"
              :class="
                userData.banned
                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                  : 'border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10'
              "
              :disabled="banMutation.isPending.value"
              @click="banMutation.mutate()"
            >
              <UIcon
                v-if="banMutation.isPending.value"
                name="i-solar-refresh-linear"
                class="size-3.5 animate-spin"
              />
              <UIcon
                v-else
                :name="userData.banned ? 'i-solar-lock-unlocked-linear' : 'i-solar-lock-linear'"
                class="size-3.5"
              />
              {{ userData.banned ? "Разблокировать" : "Заблокировать" }}
            </button>
          </div>
        </AppDataCard>
      </div>
    </template>
  </PageContainer>
</template>
