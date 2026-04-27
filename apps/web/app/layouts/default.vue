<script setup lang="ts">
import { navItems } from "~/composables/useNavigation";

const ModalProvider = defineAsyncComponent(() => import("~/components/ModalProvider.vue"));
const { activeModalSlug } = useModalAction();
const shouldMountModal = ref(false);
watch(activeModalSlug, (slug) => {
  if (slug) shouldMountModal.value = true;
});

const gate = useSiteGate();
</script>

<template>
  <SiteSoonOpening
    v-if="gate?.status === 'inactive'"
    :site-name="gate.name"
  />
  <SitePasswordGate
    v-else-if="gate?.status === 'locked'"
    :site-name="gate.name"
  />
  <div
    v-else
    class="min-h-svh flex flex-col max-w-[var(--web-site-max)] mx-auto"
  >
    <WebHeader :nav-items="navItems" />
    <main class="flex-1 pt-[var(--web-header-height)]">
      <slot />
    </main>
    <WebFooter :nav-items="navItems" />
    <ModalProvider v-if="shouldMountModal" />
  </div>
</template>
