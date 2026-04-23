<script setup lang="ts">
const { isCollapsed } = useSidebar();
const { open } = useMobileSidebar();
</script>

<template>
  <div class="min-h-svh bg-(--ui-bg-muted)">
    <AppSidebar />
    <AppSidebarMobile />

    <!-- Floating mobile menu button -->
    <button
      class="fixed top-3 left-3 z-50 lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-(--ui-bg) border border-(--ui-border) shadow-sm"
      @click="open"
    >
      <UIcon name="i-tabler-menu" class="size-5" />
    </button>

    <div
      class="flex flex-col min-h-svh transition-[padding] duration-300"
      :class="isCollapsed ? 'lg:pl-[3.75rem]' : 'lg:pl-[14.75rem]'"
    >
      <ImpersonationBanner />
      <slot />
    </div>
  </div>
</template>
