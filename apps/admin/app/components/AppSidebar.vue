<script setup lang="ts">
import { contentItems, catalogItems, mainItems, systemItems } from "../composables/useNavigation";

const { isCollapsed, toggle } = useSidebar();
const { user } = useSession();
const { isActive, handleSignOut } = useNavigation();
const { sites, currentSiteId, setSite } = useCurrentSite();
const { isAdmin, canAccessSection } = useCurrentUser();

const expandedSites = ref<Record<string, boolean>>({});

watch(
  [sites, currentSiteId],
  ([list, id]) => {
    if (id && list.length) {
      expandedSites.value = { ...expandedSites.value, [id]: true };
    }
  },
  { immediate: true },
);

function toggleSiteExpand(siteId: string) {
  expandedSites.value = { ...expandedSites.value, [siteId]: !expandedSites.value[siteId] };
}

function openSiteContent(siteId: string, path: string) {
  if (currentSiteId.value === siteId) {
    navigateTo(path);
  } else {
    setSite(siteId, path);
  }
}

const visibleContentItems = computed(() =>
  contentItems.filter((item) => !item.section || canAccessSection(item.section)),
);

const visibleCatalogItems = computed(() =>
  catalogItems.filter((item) => !item.section || canAccessSection(item.section)),
);

const visibleSystemItems = computed(() =>
  systemItems.filter((item) => !item.adminOnly || isAdmin.value),
);

const menuItems = computed(() => [
  [{ label: "Sign Out", icon: "i-tabler-logout", onSelect: handleSignOut }],
]);
</script>

<template>
  <aside
    class="fixed left-2 top-2 bottom-2 z-40 hidden lg:flex flex-col rounded-lg border border-(--ui-border) bg-(--ui-bg)/95 backdrop-blur-sm shadow-md shadow-black/[0.04] transition-all duration-300"
    :class="[isCollapsed ? 'w-14' : 'w-[232px]']"
  >
    <!-- Header -->
    <div
      class="h-11 flex items-center shrink-0 transition-all duration-300"
      :class="[isCollapsed ? 'justify-center' : 'justify-between px-2.5']"
    >
      <span v-if="!isCollapsed" class="font-semibold text-[13px] truncate tracking-tight">ZHK</span>
      <button
        type="button"
        class="p-1 rounded-md text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted) transition-colors"
        @click="toggle"
      >
        <UIcon
          :name="isCollapsed ? 'i-tabler-layout-sidebar-right' : 'i-tabler-layout-sidebar-left-collapse'"
          class="size-3.5"
        />
      </button>
    </div>

    <!-- Body -->
    <div class="flex-1 flex flex-col min-h-0 overflow-y-auto px-1.5 pb-2">
      <!-- Main (Dashboard) -->
      <nav class="flex flex-col gap-px">
        <template v-for="item in mainItems" :key="item.to">
          <NuxtLink
            v-if="!isCollapsed"
            :to="item.to"
            class="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors"
            :class="isActive(item.to)
              ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted) font-medium'
              : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)'"
          >
            <UIcon :name="item.icon" class="size-3.5 shrink-0 opacity-80" />
            <span>{{ item.label }}</span>
          </NuxtLink>
          <UTooltip v-else :text="item.label">
            <NuxtLink
              :to="item.to"
              class="flex items-center justify-center h-8 w-8 mx-auto my-px rounded-md transition-colors"
              :class="isActive(item.to)
                ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)'
                : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated)'"
            >
              <UIcon :name="item.icon" class="size-4" />
            </NuxtLink>
          </UTooltip>
        </template>
      </nav>

      <!-- Sites -->
      <div v-if="sites.length" class="mt-3 pt-3 border-t border-(--ui-border)">
        <div
          v-if="!isCollapsed"
          class="px-2.5 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-(--ui-text-dimmed) select-none"
        >
          Сайты
        </div>

        <template v-for="site in sites" :key="site.id">
          <button
            v-if="!isCollapsed"
            type="button"
            class="flex items-center gap-1.5 px-2 py-1.5 rounded-md w-full text-left text-[13px] transition-colors group"
            :class="currentSiteId === site.id
              ? 'text-(--ui-text-highlighted) font-medium'
              : 'text-(--ui-text-muted) hover:text-(--ui-text-highlighted)'"
            @click="toggleSiteExpand(site.id)"
          >
            <UIcon
              name="i-tabler-chevron-right"
              class="size-3 shrink-0 opacity-60 transition-transform duration-150"
              :class="{ 'rotate-90': expandedSites[site.id] }"
            />
            <UIcon
              :name="site.isPrimary ? 'i-tabler-home-star' : 'i-tabler-building-store'"
              class="size-3.5 shrink-0 opacity-80"
            />
            <span class="truncate flex-1">{{ site.name }}</span>
            <span
              v-if="currentSiteId === site.id"
              class="size-1.5 rounded-full bg-(--ui-primary) shrink-0"
              aria-label="active"
            />
          </button>
          <UTooltip v-else :text="site.name">
            <button
              type="button"
              class="flex items-center justify-center h-8 w-8 mx-auto my-px rounded-md transition-colors"
              :class="currentSiteId === site.id
                ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)'
                : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated)'"
              @click="setSite(site.id)"
            >
              <UIcon :name="site.isPrimary ? 'i-tabler-home-star' : 'i-tabler-building-store'" class="size-4" />
            </button>
          </UTooltip>

          <nav
            v-if="expandedSites[site.id] && !isCollapsed"
            class="flex flex-col gap-px ml-3.5 pl-2.5 border-l border-(--ui-border) my-0.5"
          >
            <button
              v-for="item in visibleContentItems"
              :key="item.to"
              type="button"
              class="flex items-center gap-2 px-2 py-1 rounded-md w-full text-left text-[12.5px] transition-colors"
              :class="currentSiteId === site.id && isActive(item.to)
                ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted) font-medium'
                : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)'"
              @click="openSiteContent(site.id, item.to)"
            >
              <UIcon :name="item.icon" class="size-3.5 shrink-0 opacity-70" />
              <span>{{ item.label }}</span>
            </button>
          </nav>
        </template>
      </div>

      <!-- Shared catalog -->
      <div v-if="visibleCatalogItems.length" class="mt-3 pt-3 border-t border-(--ui-border)">
        <div
          v-if="!isCollapsed"
          class="px-2.5 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-(--ui-text-dimmed) select-none"
        >
          Каталог
        </div>
        <nav class="flex flex-col gap-px">
          <template v-for="item in visibleCatalogItems" :key="item.to">
            <NuxtLink
              v-if="!isCollapsed"
              :to="item.to"
              class="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors"
              :class="isActive(item.to)
                ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted) font-medium'
                : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)'"
            >
              <UIcon :name="item.icon" class="size-3.5 shrink-0 opacity-80" />
              <span>{{ item.label }}</span>
            </NuxtLink>
            <UTooltip v-else :text="item.label">
              <NuxtLink
                :to="item.to"
                class="flex items-center justify-center h-8 w-8 mx-auto my-px rounded-md transition-colors"
                :class="isActive(item.to)
                  ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)'
                  : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated)'"
              >
                <UIcon :name="item.icon" class="size-4" />
              </NuxtLink>
            </UTooltip>
          </template>
        </nav>
      </div>

      <!-- Admin system -->
      <div v-if="visibleSystemItems.length" class="mt-3 pt-3 border-t border-(--ui-border)">
        <div
          v-if="!isCollapsed"
          class="px-2.5 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-(--ui-text-dimmed) select-none"
        >
          Система
        </div>
        <nav class="flex flex-col gap-px">
          <template v-for="item in visibleSystemItems" :key="item.to">
            <NuxtLink
              v-if="!isCollapsed"
              :to="item.to"
              class="flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors"
              :class="isActive(item.to)
                ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted) font-medium'
                : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)'"
            >
              <UIcon :name="item.icon" class="size-3.5 shrink-0 opacity-80" />
              <span>{{ item.label }}</span>
            </NuxtLink>
            <UTooltip v-else :text="item.label">
              <NuxtLink
                :to="item.to"
                class="flex items-center justify-center h-8 w-8 mx-auto my-px rounded-md transition-colors"
                :class="isActive(item.to)
                  ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)'
                  : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated)'"
              >
                <UIcon :name="item.icon" class="size-4" />
              </NuxtLink>
            </UTooltip>
          </template>
        </nav>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-1.5 py-1.5 border-t border-(--ui-border) shrink-0 flex flex-col gap-0.5">
      <div :class="isCollapsed ? 'flex justify-center' : 'flex px-0.5'">
        <UTooltip v-if="isCollapsed" text="Theme">
          <UColorModeButton size="xs" />
        </UTooltip>
        <UColorModeButton v-else size="xs" />
      </div>

      <UDropdownMenu :items="menuItems" :ui="{ content: 'w-56 mb-2' }">
        <button
          type="button"
          class="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-(--ui-bg-elevated) transition-colors"
          :class="[isCollapsed ? 'justify-center' : '']"
        >
          <UAvatar :alt="user?.name ?? 'U'" size="xs" />
          <div v-if="!isCollapsed" class="flex flex-col items-start min-w-0 flex-1 text-left">
            <span class="text-[12.5px] font-medium truncate w-full block">{{ user?.name || user?.email || 'User' }}</span>
            <span class="text-[11px] text-(--ui-text-dimmed) truncate w-full block">{{ user?.email }}</span>
          </div>
          <UIcon v-if="!isCollapsed" name="i-tabler-chevron-up" class="size-3.5 text-(--ui-text-dimmed) shrink-0" />
        </button>
      </UDropdownMenu>
    </div>
  </aside>
</template>
