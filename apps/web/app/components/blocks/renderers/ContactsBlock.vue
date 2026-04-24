<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { SOCIAL_TYPE_ICONS, type SocialLinkType } from "@zhk/api/shared/socials";
import { telHref } from "~/utils/phone";

const props = defineProps<{
  title?: string;
  contactIds: string[];
  showMap?: boolean;
}>();

const { orpc } = useOrpc();
const { socials: siteSocials } = useSiteContacts();

function socialsFor(c: { socials?: { type: SocialLinkType; link: string }[] | null }) {
  return c.socials && c.socials.length ? c.socials : siteSocials.value;
}

const { data, suspense } = useQuery(
  computed(() => ({
    ...orpc.public.contacts.getByIds.queryOptions({ input: { ids: props.contactIds } }),
    enabled: props.contactIds.length > 0,
  })),
);

onServerPrefetch(suspense);

const items = computed(() => {
  const list = data.value ?? [];
  const order = new Map(props.contactIds.map((id, i) => [id, i]));
  return [...list].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
});

const mapCoordinates = computed(() => {
  if (props.showMap === false) return null;
  const first = items.value.find((c) => c.coordinates);
  return first?.coordinates ?? null;
});
</script>

<template>
  <div class="section">
    <div class="container-web">
      <h2
        v-if="title"
        class="text-3xl font-bold tracking-tight text-[var(--web-text-primary)] md:text-4xl"
      >
        {{ title }}
      </h2>

      <div
        v-if="items.length"
        class="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        <div
          v-for="c in items"
          :key="c.id"
          class="rounded-[var(--radius-xl)] border border-[var(--web-border)] p-6"
        >
          <h3 class="text-lg font-semibold text-[var(--web-text-primary)]">{{ c.label }}</h3>
          <div class="mt-4 flex flex-col gap-2 text-sm">
            <a
              v-if="c.phone"
              :href="telHref(c.phone)"
              class="font-medium text-[var(--web-text-primary)] hover:text-[var(--web-accent)]"
            >
              {{ c.phone }}
            </a>
            <a
              v-if="c.email"
              :href="`mailto:${c.email}`"
              class="text-[var(--web-text-secondary)] hover:text-[var(--web-accent)]"
            >
              {{ c.email }}
            </a>
            <span v-if="c.address" class="text-[var(--web-text-secondary)]">{{ c.address }}</span>
            <span v-if="c.workingHours" class="text-xs text-[var(--web-text-muted)]">
              {{ c.workingHours }}
            </span>
          </div>
          <div v-if="socialsFor(c).length" class="mt-4 flex items-center gap-3">
            <a
              v-for="s in socialsFor(c)"
              :key="s.link"
              :href="s.link"
              target="_blank"
              rel="noopener"
              class="flex size-9 items-center justify-center rounded-full border border-[var(--web-border)] text-[var(--web-text-secondary)] transition hover:border-[var(--web-accent)] hover:text-[var(--web-accent)]"
            >
              <Icon :name="SOCIAL_TYPE_ICONS[s.type] ?? 'lucide:link'" class="size-4" />
            </a>
          </div>
        </div>
      </div>

      <div v-if="mapCoordinates" class="mt-10">
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
      </div>
    </div>
  </div>
</template>
