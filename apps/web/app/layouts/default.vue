<script setup lang="ts">
import { navItems } from "~/composables/useNavigation";
</script>

<template>
  <div class="min-h-svh flex flex-col">
    <WebHeader :nav-items="navItems" />
    <main class="flex-1 pt-[var(--web-header-height)]">
      <slot />
    </main>
    <WebFooter :nav-items="navItems" />
  </div>
</template>
