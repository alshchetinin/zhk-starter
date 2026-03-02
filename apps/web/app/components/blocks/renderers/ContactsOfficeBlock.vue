<script setup lang="ts">
defineProps<{
  title: string;
  phone: string;
  email: string;
  address: string;
  mapCoordinates?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  socials?: Array<{ type: string; url: string }>;
  departments: Array<{ name: string; phone: string; email: string }>;
}>();

const { fadeUp, staggerContainer, staggerChild } = useMotionPresets();

const socialIcons: Record<string, string> = {
  telegram: 'lucide:send',
  whatsapp: 'lucide:message-circle',
  vk: 'lucide:users',
};
</script>

<template>
  <div class="section">
    <div class="container-web">
      <Motion as="div" v-bind="fadeUp">
        <h2 class="text-3xl font-bold tracking-tight text-[var(--web-text-primary)] md:text-4xl">
          {{ title }}
        </h2>
      </Motion>

      <Motion as="div" v-bind="fadeUp" class="mt-8">
        <div class="flex flex-wrap items-center gap-x-10 gap-y-4 border-b border-[var(--web-border)] pb-6">
          <div>
            <span class="text-sm text-[var(--web-text-muted)]">Телефон</span>
            <a :href="`tel:${phone.replace(/[^+\d]/g, '')}`" class="mt-1 block text-lg font-semibold text-[var(--web-text-primary)] hover:text-[var(--web-accent)]">
              {{ phone }}
            </a>
          </div>
          <div>
            <span class="text-sm text-[var(--web-text-muted)]">Email</span>
            <a :href="`mailto:${email}`" class="mt-1 block text-lg font-semibold text-[var(--web-text-primary)] hover:text-[var(--web-accent)]">
              {{ email }}
            </a>
          </div>
          <div v-if="socials?.length" class="flex items-center gap-3">
            <a
              v-for="social in socials"
              :key="social.type"
              :href="social.url"
              target="_blank"
              rel="noopener noreferrer"
              class="flex size-10 items-center justify-center rounded-full border border-[var(--web-border)] text-[var(--web-text-secondary)] transition hover:border-[var(--web-accent)] hover:text-[var(--web-accent)]"
            >
              <Icon :name="socialIcons[social.type] ?? 'lucide:link'" class="size-5" />
            </a>
          </div>
        </div>
      </Motion>

      <Motion as="div" v-bind="fadeUp" class="mt-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span class="text-sm text-[var(--web-text-muted)]">Адрес</span>
            <p class="mt-1 text-lg font-semibold text-[var(--web-text-primary)]">{{ address }}</p>
          </div>
          <UiButton v-if="buttonLabel" :as="buttonUrl ? 'a' : 'button'" :href="buttonUrl" variant="outline">
            {{ buttonLabel }}
          </UiButton>
        </div>
      </Motion>

      <Motion
        as="div"
        :variants="staggerContainer"
        initial="hidden"
        whileInView="show"
        :inViewOptions="{ once: true }"
        class="mt-10"
      >
        <div class="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--web-border)]">
          <Motion
            as="div"
            v-for="(dept, i) in departments"
            :key="i"
            :variants="staggerChild"
            class="flex flex-col gap-2 border-b border-[var(--web-border)] px-6 py-4 last:border-b-0 md:flex-row md:items-center md:gap-8"
          >
            <span class="min-w-48 font-medium text-[var(--web-text-primary)]">{{ dept.name }}</span>
            <a :href="`tel:${dept.phone.replace(/[^+\d]/g, '')}`" class="text-[var(--web-text-secondary)] hover:text-[var(--web-accent)]">
              {{ dept.phone }}
            </a>
            <a :href="`mailto:${dept.email}`" class="text-[var(--web-text-secondary)] hover:text-[var(--web-accent)]">
              {{ dept.email }}
            </a>
          </Motion>
        </div>
      </Motion>

      <Motion v-if="mapCoordinates" as="div" v-bind="fadeUp" class="mt-10">
        <div class="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--web-border)]">
          <iframe
            :src="`https://yandex.ru/map-widget/v1/?ll=${mapCoordinates.split(',').reverse().join(',')}&z=15&pt=${mapCoordinates.split(',').reverse().join(',')},pm2rdm`"
            width="100%"
            height="400"
            frameborder="0"
            allowfullscreen
            loading="lazy"
            class="block w-full"
          />
        </div>
      </Motion>
    </div>
  </div>
</template>
