<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const route = useRoute();
const router = useRouter();
const { $orpc, $orpcClient } = useNuxtApp();
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

const ALL_SECTIONS = [
  { id: "homepage", label: "Главная" },
  { id: "news", label: "Новости" },
  { id: "pages", label: "Страницы" },
  { id: "promotions", label: "Акции" },
  { id: "documents", label: "Документы" },
  { id: "tickets", label: "Заявки" },
  { id: "contacts", label: "Контакты" },
  { id: "projects", label: "Projects" },
  { id: "buildings", label: "Buildings" },
  { id: "apartments", label: "Apartments" },
  { id: "commerce", label: "Commerce" },
  { id: "layouts", label: "Layouts" },
];

watchEffect(() => {
  if (userData.value) {
    role.value = (userData.value.role as "admin" | "editor") ?? "editor";
    const p = (userData.value.permissions ?? {}) as {
      siteIds?: string[];
      sections?: string[];
      actions?: Array<"view" | "edit" | "publish">;
    };
    allowedSiteIds.value = p.siteIds ?? [];
    allowedSections.value = p.sections ?? [];
    allowedActions.value = p.actions ?? ["view"];
  }
});

const roleMutation = useMutation({
  mutationFn: () => $orpcClient.users.updateRole({ id: id.value, role: role.value }),
  onSuccess: () => {
    toast.add({ title: "Роль обновлена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.users.key() });
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

function toggle<T>(list: Ref<T[]>, value: T) {
  const i = list.value.indexOf(value);
  if (i >= 0) list.value.splice(i, 1);
  else list.value.push(value);
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
          <UButton
            class="mt-4 bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
            :loading="roleMutation.isPending.value"
            @click="roleMutation.mutate()"
          >
            Сохранить роль
          </UButton>
        </section>

        <section v-if="role === 'editor'" class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-6 flex flex-col gap-5">
          <h3 class="text-lg font-semibold">Права редактора</h3>

          <div>
            <h4 class="text-sm font-medium mb-2">Разрешённые сайты</h4>
            <p class="text-xs text-(--ui-text-muted) mb-3">Пусто = все сайты</p>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="s in (sitesData ?? [])"
                :key="s.id"
                :color="allowedSiteIds.includes(s.id) ? 'primary' : 'neutral'"
                :variant="allowedSiteIds.includes(s.id) ? 'solid' : 'subtle'"
                class="cursor-pointer select-none"
                @click="toggle(allowedSiteIds, s.id)"
              >
                {{ s.name }}
              </UBadge>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-medium mb-2">Разрешённые разделы</h4>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="sec in ALL_SECTIONS"
                :key="sec.id"
                :color="allowedSections.includes(sec.id) ? 'primary' : 'neutral'"
                :variant="allowedSections.includes(sec.id) ? 'solid' : 'subtle'"
                class="cursor-pointer select-none"
                @click="toggle(allowedSections, sec.id)"
              >
                {{ sec.label }}
              </UBadge>
            </div>
          </div>

          <div>
            <h4 class="text-sm font-medium mb-2">Действия</h4>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="a in (['view', 'edit', 'publish'] as const)"
                :key="a"
                :color="allowedActions.includes(a) ? 'primary' : 'neutral'"
                :variant="allowedActions.includes(a) ? 'solid' : 'subtle'"
                class="cursor-pointer select-none"
                @click="toggle(allowedActions, a)"
              >
                {{ a === 'view' ? 'Просмотр' : a === 'edit' ? 'Редактирование' : 'Публикация' }}
              </UBadge>
            </div>
          </div>

          <div>
            <UButton
              class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
              :loading="permissionsMutation.isPending.value"
              @click="permissionsMutation.mutate()"
            >
              Сохранить права
            </UButton>
          </div>
        </section>
      </div>
    </template>
  </PageContainer>
</template>
