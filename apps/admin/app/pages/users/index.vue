<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const { $orpc } = useNuxtApp();
const { isAdmin, isLoading } = useCurrentUser();

const { data, isPending } = useQuery($orpc.users.list.queryOptions());
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
    </template>
  </PageContainer>
</template>
