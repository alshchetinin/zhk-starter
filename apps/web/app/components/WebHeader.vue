<script setup lang="ts">
import type { NavItem } from "~/composables/useNavigation";
import { telHref } from "~/utils/phone";

defineProps<{
  navItems: NavItem[];
}>();

const SCROLL_THRESHOLD_PX = 20;
const isScrolled = ref(false);

if (import.meta.client) {
  const { y } = useWindowScroll();
  watchEffect(() => {
    isScrolled.value = y.value > SCROLL_THRESHOLD_PX;
  });
}

const isMobileMenuOpen = ref(false);
const route = useRoute();

const { header: headerContacts } = useSiteContacts();
const primaryContact = computed(() => headerContacts.value[0]);

watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false;
  },
);

const { open: openModal } = useModalAction();
</script>

<template>
  <header
    class="fixed top-0 inset-x-0 z-50 transition-[background-color,border-color,box-shadow] duration-300"
    :class="[
      isScrolled
        ? 'bg-white/95 backdrop-blur-md border-b border-[var(--web-border)] shadow-sm'
        : 'bg-transparent',
    ]"
  >
    <div
      class="container-web flex items-center justify-between h-[var(--web-header-height)]"
    >
      <!-- Logo -->
      <NuxtLink
        to="/"
        class="text-xl font-bold tracking-tight text-[var(--web-text-primary)]"
      >
        Logo
      </NuxtLink>

      <!-- Desktop navigation -->
      <nav class="hidden md:flex items-center gap-8">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="text-sm font-medium text-[var(--web-text-secondary)] hover:text-[var(--web-text-primary)] transition-colors"
          active-class="!text-[var(--web-accent)]"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <!-- CTA + mobile toggle -->
      <div class="flex items-center gap-4">
        <a
          v-if="primaryContact?.phone"
          :href="telHref(primaryContact.phone)"
          class="hidden md:inline-flex text-sm font-medium text-[var(--web-text-primary)] hover:text-[var(--web-accent)] transition-colors"
        >
          {{ primaryContact.phone }}
        </a>
        <button
          type="button"
          class="hidden md:inline-flex items-center text-sm font-medium text-[var(--web-text-primary)] hover:text-[var(--web-accent)] transition-colors"
          @click="openModal('zakazat-zvonok')"
        >
          Заказать звонок
        </button>

        <UiButton as-child variant="primary" class="hidden md:inline-flex">
          <NuxtLink to="/projects">
            Выбрать квартиру
          </NuxtLink>
        </UiButton>

        <button
          class="md:hidden flex items-center justify-center w-10 h-10 rounded-lg"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          <Icon
            :name="isMobileMenuOpen ? 'lucide:x' : 'lucide:menu'"
            class="size-5"
          />
        </button>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="isMobileMenuOpen"
        class="md:hidden bg-white border-b border-[var(--web-border)] shadow-lg"
      >
        <nav class="container-web py-4 flex flex-col gap-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="px-4 py-3 text-sm font-medium text-[var(--web-text-secondary)] hover:text-[var(--web-text-primary)] hover:bg-[var(--web-bg-muted)] rounded-lg transition-colors"
            active-class="!text-[var(--web-accent)] !bg-[var(--web-accent-light)]"
          >
            {{ item.label }}
          </NuxtLink>
          <UiButton as-child variant="primary" class="mt-2 w-full justify-center">
            <NuxtLink to="/projects">
              Выбрать квартиру
            </NuxtLink>
          </UiButton>
        </nav>
      </div>
    </Transition>
  </header>
</template>
