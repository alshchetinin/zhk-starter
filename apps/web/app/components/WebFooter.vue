<script setup lang="ts">
import type { NavItem } from "~/composables/useNavigation";

defineProps<{
  navItems: NavItem[];
}>();

const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="bg-[var(--web-bg-muted)] border-t border-[var(--web-border)]">
    <div class="container-web py-12 md:py-16">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Brand -->
        <div>
          <NuxtLink
            to="/"
            class="text-lg font-bold text-[var(--web-text-primary)]"
          >
            Logo
          </NuxtLink>
          <p class="mt-3 text-sm text-[var(--web-text-secondary)] max-w-xs">
            Современные жилые комплексы с продуманной инфраструктурой
          </p>
        </div>

        <!-- Navigation -->
        <div>
          <h3
            class="text-sm font-semibold text-[var(--web-text-primary)] mb-4"
          >
            Навигация
          </h3>
          <nav class="flex flex-col gap-2">
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="text-sm text-[var(--web-text-secondary)] hover:text-[var(--web-text-primary)] transition-colors"
            >
              {{ item.label }}
            </NuxtLink>
          </nav>
        </div>

        <!-- Contacts -->
        <div>
          <h3
            class="text-sm font-semibold text-[var(--web-text-primary)] mb-4"
          >
            Контакты
          </h3>
          <div
            class="flex flex-col gap-2 text-sm text-[var(--web-text-secondary)]"
          >
            <a
              href="tel:+70001234567"
              class="hover:text-[var(--web-text-primary)] transition-colors"
            >
              +7 (000) 123-45-67
            </a>
            <a
              href="mailto:info@example.com"
              class="hover:text-[var(--web-text-primary)] transition-colors"
            >
              info@example.com
            </a>
          </div>
        </div>
      </div>

      <!-- Bottom bar -->
      <div
        class="mt-12 pt-6 border-t border-[var(--web-border)] flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[var(--web-text-muted)]"
      >
        <p>&copy; {{ currentYear }} ЖК. Все права защищены.</p>
        <div class="flex gap-6">
          <NuxtLink
            to="/pages/privacy"
            class="hover:text-[var(--web-text-secondary)] transition-colors"
          >
            Политика конфиденциальности
          </NuxtLink>
        </div>
      </div>
    </div>
  </footer>
</template>
