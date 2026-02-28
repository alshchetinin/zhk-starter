<script setup lang="ts">
const route = useRoute();
const { isOpen, close } = useMobileSidebar();
const { user } = useSession();
const { $authClient } = useNuxtApp();
const toast = useToast();

interface NavItem {
  label: string;
  icon: string;
  to: string;
}

const mainItems: NavItem[] = [
  { label: "Dashboard", icon: "i-tabler-layout-dashboard", to: "/" },
];

const realtyItems: NavItem[] = [
  { label: "Projects", icon: "i-tabler-building", to: "/projects" },
  { label: "Buildings", icon: "i-tabler-building-skyscraper", to: "/buildings" },
  { label: "Apartments", icon: "i-tabler-home", to: "/apartments" },
  { label: "Commerce", icon: "i-tabler-shopping-cart", to: "/commerce" },
  { label: "Layouts", icon: "i-tabler-layout", to: "/layouts" },
];

const systemItems: NavItem[] = [
  { label: "Integrations", icon: "i-tabler-plug", to: "/integrations" },
];

function isActive(to: string) {
  if (to === "/") return route.path === "/";
  return route.path.startsWith(to);
}

async function handleSignOut() {
  try {
    await $authClient.signOut();
    toast.add({ title: "Signed out", color: "success" });
    window.location.href = "/";
  } catch {
    toast.add({ title: "Error signing out", color: "error" });
  }
}
</script>

<template>
  <USlideover
    v-model="isOpen"
    side="left"
    title="Menu"
    :ui="{ body: 'p-0 sm:p-0', header: 'p-4 border-b border-(--ui-border)' }"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <span class="text-xl font-bold">ZHK Admin</span>
        <UButton color="neutral" variant="ghost" icon="i-tabler-x" @click="close" />
      </div>
    </template>

    <template #body>
      <div class="flex flex-col h-full p-4">
        <template v-for="(group, gi) in [mainItems, realtyItems, systemItems]" :key="gi">
          <div v-if="gi > 0" class="h-px bg-(--ui-border) my-3" />
          <nav class="flex flex-col gap-1">
            <NuxtLink
              v-for="item in group"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-3 py-3 rounded-md transition-colors text-base font-medium"
              :class="[
                isActive(item.to)
                  ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)'
                  : 'text-(--ui-text-muted) hover:bg-(--ui-bg-elevated) hover:text-(--ui-text-highlighted)'
              ]"
              @click="close"
            >
              <UIcon :name="item.icon" class="size-5 shrink-0" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>
        </template>

        <div class="flex-1" />

        <!-- Theme + User -->
        <div class="flex items-center gap-2 py-3 border-t border-(--ui-border)">
          <UColorModeButton />
        </div>

        <div class="pt-2 border-t border-(--ui-border)">
          <div class="flex items-center gap-3 px-2 py-2">
            <UAvatar :alt="user?.name ?? 'U'" size="sm" />
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-sm font-medium truncate">{{ user?.name || user?.email || 'User' }}</span>
              <span class="text-xs text-(--ui-text-muted) truncate">{{ user?.email }}</span>
            </div>
          </div>
          <UButton
            block
            variant="ghost"
            color="neutral"
            icon="i-tabler-logout"
            label="Sign Out"
            class="mt-2"
            @click="handleSignOut"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>
