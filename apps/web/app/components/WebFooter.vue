<script setup lang="ts">
import {
  SOCIAL_TYPE_ICONS,
  isMessengerSocial,
  type SocialLinkType,
} from "@zhk/api/shared/socials";
import type { NavItem } from "~/composables/useNavigation";
import { telHref } from "~/utils/phone";

defineProps<{
  navItems: NavItem[];
}>();

const { footer: footerContacts, socials: siteSocials } = useSiteContacts();
const currentYear = new Date().getFullYear();
const { trackPhoneClick, trackMessengerClick } = useTracking();

function socialsFor(contact: (typeof footerContacts.value)[number]) {
  return contact.socials?.length ? contact.socials : siteSocials.value;
}

function onSocialClick(type: SocialLinkType) {
  if (isMessengerSocial(type)) trackMessengerClick(type);
}
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
          <h3 class="text-sm font-semibold text-[var(--web-text-primary)] mb-4">
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
        <div v-if="footerContacts.length" class="flex flex-col gap-6">
          <div v-for="c in footerContacts" :key="c.id">
            <h3 class="text-sm font-semibold text-[var(--web-text-primary)] mb-3">
              {{ c.label }}
            </h3>
            <div class="flex flex-col gap-2 text-sm text-[var(--web-text-secondary)]">
              <a
                v-if="c.phone"
                :href="telHref(c.phone)"
                class="hover:text-[var(--web-text-primary)] transition-colors"
                @click="trackPhoneClick(c.phone)"
              >
                {{ c.phone }}
              </a>
              <a
                v-if="c.email"
                :href="`mailto:${c.email}`"
                class="hover:text-[var(--web-text-primary)] transition-colors"
              >
                {{ c.email }}
              </a>
              <span v-if="c.address">{{ c.address }}</span>
              <span v-if="c.workingHours" class="text-xs text-[var(--web-text-muted)]">
                {{ c.workingHours }}
              </span>
              <div v-if="socialsFor(c).length" class="mt-2 flex gap-3">
                <a
                  v-for="s in socialsFor(c)"
                  :key="s.link"
                  :href="s.link"
                  target="_blank"
                  rel="noopener"
                  class="text-[var(--web-text-secondary)] hover:text-[var(--web-text-primary)] transition-colors"
                  @click="onSocialClick(s.type)"
                >
                  <Icon :name="SOCIAL_TYPE_ICONS[s.type] ?? 'lucide:link'" class="size-5" />
                </a>
              </div>
            </div>
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
