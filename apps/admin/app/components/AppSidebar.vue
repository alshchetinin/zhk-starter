<script setup lang="ts">
const { isCollapsed, toggle } = useSidebar();
const { user } = useSession();
const { navGroups, isActive, handleSignOut } = useNavigation();

const menuItems = computed(() => [
  [{ label: "Sign Out", icon: "i-tabler-logout", onSelect: handleSignOut }],
]);
</script>

<template>
  <aside
    class="fixed left-0 top-0 z-40 h-screen border-r border-(--ui-border) bg-(--ui-bg) transition-all duration-300 hidden lg:flex flex-col"
    :class="[isCollapsed ? 'w-16' : 'w-64']"
  >
    <!-- Header -->
    <div
      class="h-16 flex items-center shrink-0 border-b border-(--ui-border) transition-all duration-300"
      :class="[isCollapsed ? 'justify-center' : 'justify-between px-4']"
    >
      <span v-if="!isCollapsed" class="font-bold text-lg truncate">ZHK Admin</span>
      <UButton
        variant="ghost"
        color="neutral"
        :icon="isCollapsed ? 'i-tabler-layout-sidebar-right' : 'i-tabler-layout-sidebar-left-collapse'"
        @click="toggle"
      />
    </div>

    <!-- Site switcher -->
    <div class="px-2 pt-3">
      <AppSiteSwitcher :collapsed="isCollapsed" />
    </div>

    <!-- Body -->
    <div class="flex-1 flex flex-col min-h-0 overflow-y-auto px-2 py-4 gap-4">
      <!-- Nav groups -->
      <template v-for="(group, gi) in navGroups" :key="gi">
        <div v-if="gi > 0" class="h-px bg-(--ui-border) mx-2" />
        <nav class="flex flex-col gap-1" :class="{ 'mt-auto': gi === 3 }">
          <template v-for="item in group" :key="item.to">
            <!-- Expanded -->
            <NuxtLink
              v-if="!isCollapsed"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium whitespace-nowrap"
              :class="[
                isActive(item.to)
                  ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)'
                  : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)'
              ]"
            >
              <UIcon :name="item.icon" class="size-5 shrink-0" />
              <span>{{ item.label }}</span>
            </NuxtLink>

            <!-- Collapsed -->
            <UTooltip v-else :text="item.label">
              <NuxtLink
                :to="item.to"
                class="flex items-center justify-center w-full aspect-square rounded-md transition-colors"
                :class="[
                  isActive(item.to)
                    ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)'
                    : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)'
                ]"
              >
                <UIcon :name="item.icon" class="size-5" />
              </NuxtLink>
            </UTooltip>
          </template>
        </nav>
      </template>
    </div>

    <!-- Footer: Theme + User -->
    <div class="p-2 border-t border-(--ui-border) shrink-0 flex flex-col gap-2">
      <!-- Color mode -->
      <div :class="isCollapsed ? 'flex justify-center' : 'flex px-1'">
        <UTooltip v-if="isCollapsed" text="Theme">
          <UColorModeButton size="sm" />
        </UTooltip>
        <UColorModeButton v-else />
      </div>

      <!-- User menu -->
      <UDropdownMenu :items="menuItems" :ui="{ content: 'w-56 mb-2' }">
        <UButton
          color="neutral"
          variant="ghost"
          class="w-full p-2 h-auto"
          :class="[isCollapsed ? 'justify-center' : 'justify-start']"
        >
          <UAvatar :alt="user?.name ?? 'U'" size="sm" />
          <div v-if="!isCollapsed" class="flex flex-col items-start min-w-0 flex-1 ml-2 text-left">
            <span class="text-sm font-medium truncate w-full block">{{ user?.name || user?.email || 'User' }}</span>
            <span class="text-xs text-(--ui-text-muted) truncate w-full block">{{ user?.email }}</span>
          </div>
          <UIcon v-if="!isCollapsed" name="i-tabler-chevron-up" class="size-4 ml-2 text-(--ui-text-muted) shrink-0" />
        </UButton>
      </UDropdownMenu>
    </div>
  </aside>
</template>
