<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { AppRouterClient } from "@zhk/api/routers/index";

type DashboardOverview = Awaited<ReturnType<AppRouterClient["dashboard"]["overview"]>>;

const props = defineProps<{ data: DashboardOverview }>();

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const data = computed(() => props.data);

const syncTone = computed(() => {
  const sync = data.value.sync;
  if (!sync.integration) return "muted" as const;
  const log = sync.lastLog;
  if (sync.integration.status === "loading" || log?.status === "running")
    return "loading" as const;
  if (log?.status === "failed") return "error" as const;
  if (log?.status === "success") return "success" as const;
  return "muted" as const;
});
const syncLabel = computed(() => {
  const m = {
    success: "Синхронизация ок",
    error: "Ошибка sync'а",
    loading: "Синхронизация…",
    muted: data.value.sync.integration ? "Sync не запускался" : "Нет интеграции",
  };
  return m[syncTone.value];
});

const syncMut = useMutation({
  mutationFn: () => {
    const id = data.value.sync.integration?.id;
    if (!id) throw new Error("Нет интеграции");
    return $orpcClient.integration.triggerSync({
      integrationId: id,
      complexes: [],
    });
  },
  onSuccess: () => {
    toast.add({ title: "Sync запущен", color: "success" });
    setTimeout(
      () =>
        queryClient.invalidateQueries({
          queryKey: $orpc.dashboard.overview.key(),
        }),
      1500,
    );
  },
  onError: (e: any) =>
    toast.add({ title: "Ошибка", description: e.message, color: "error" }),
});

const apt = computed(() => data.value.apartments);
const aptSegments = computed(() => {
  const a = apt.value;
  if (!a.total) return [];
  return [
    {
      key: "free",
      label: "Свободно",
      n: a.free,
      pct: (a.free / a.total) * 100,
      bar: "bg-emerald-500",
      dot: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      key: "paid",
      label: "Бронь оплачена",
      n: a.paidReservation,
      pct: (a.paidReservation / a.total) * 100,
      bar: "bg-amber-500",
      dot: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      key: "corp",
      label: "Бронь корп.",
      n: a.corporateReservation,
      pct: (a.corporateReservation / a.total) * 100,
      bar: "bg-violet-500",
      dot: "bg-violet-500",
      text: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      key: "sold",
      label: "Продано",
      n: a.sold,
      pct: (a.sold / a.total) * 100,
      bar: "bg-zinc-400 dark:bg-zinc-600",
      dot: "bg-zinc-400 dark:bg-zinc-600",
      text: "text-zinc-600 dark:text-zinc-400",
      bg: "bg-zinc-500/10",
    },
  ];
});

const ticketTypes = [
  { key: "lead", label: "Лиды", icon: "i-tabler-user-plus" },
  { key: "callback", label: "Перезвонить", icon: "i-tabler-phone-call" },
  { key: "question", label: "Вопросы", icon: "i-tabler-message-circle" },
  { key: "booking", label: "Брони", icon: "i-tabler-bookmark" },
] as const;
const ticketsMax7d = computed(() => {
  return Math.max(1, ...ticketTypes.map((t) => data.value.tickets.last7d[t.key]));
});

const { setSite, currentSiteId } = useCurrentSite();

const selectedDraftSiteId = ref<string | null>(null);

const activeDraftSiteId = computed(() => {
  const id = selectedDraftSiteId.value;
  if (id == null) return null;
  return data.value.drafts.bySite.some((s) => s.siteId === id) ? id : null;
});

const draftTabs = computed(() => [
  { id: null, label: "Все", total: data.value.drafts.totals.total, isPrimary: false },
  ...data.value.drafts.bySite.map((s) => ({
    id: s.siteId,
    label: s.siteName,
    total: s.total,
    isPrimary: s.isPrimary,
  })),
]);

const draftItems = computed(() => {
  const id = activeDraftSiteId.value;
  const d =
    id == null
      ? data.value.drafts.totals
      : data.value.drafts.bySite.find((s) => s.siteId === id)
          ?? data.value.drafts.totals;
  return [
    { label: "Новости", n: d.news, to: "/news", icon: "i-tabler-news" },
    { label: "Акции", n: d.promotions, to: "/promotions", icon: "i-tabler-discount" },
    { label: "Страницы", n: d.pages, to: "/pages", icon: "i-tabler-file-text" },
    { label: "Модалки", n: d.modals, to: "/modals", icon: "i-tabler-app-window" },
    { label: "Ход стройки", n: d.constructionProgress, to: "/projects", icon: "i-tabler-crane" },
  ];
});

const draftsTotal = computed(() => data.value.drafts.totals.total);

function onDraftItemClick(to: string) {
  const id = activeDraftSiteId.value;
  if (id == null || id === currentSiteId.value) return navigateTo(to);
  setSite(id, to);
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <AppStatHero
        to="/apartments"
        label="Квартиры"
        accent="emerald"
      >
        <template #value>{{ fmtNum(apt.total) }}</template>
        <template #sub>
          <span
            v-if="apt.total"
            class="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums"
          >
            {{ Math.round((apt.free / apt.total) * 100) }}% свободно
          </span>
        </template>
        <div
          v-if="apt.total"
          class="flex h-1.5 rounded-full overflow-hidden bg-(--ui-bg-elevated)"
        >
          <div
            v-for="seg in aptSegments"
            :key="seg.key"
            :class="seg.bar"
            :style="{ width: seg.pct + '%' }"
            :title="`${seg.label}: ${seg.n}`"
          />
        </div>
      </AppStatHero>

      <AppStatHero
        to="/tickets"
        label="Заявки · 24ч"
        accent="indigo"
      >
        <template #value>{{ data.tickets.last24h.total }}</template>
        <template #sub>
          <span class="text-xs text-(--ui-text-dimmed) tabular-nums">
            / {{ data.tickets.last7d.total }} за 7 дней
          </span>
        </template>
        <div class="flex gap-1">
          <span
            v-for="t in ticketTypes"
            :key="t.key"
            class="flex-1 h-1.5 rounded-full bg-(--ui-bg-elevated) overflow-hidden"
            :title="`${t.label}: ${data.tickets.last7d[t.key]} (7д)`"
          >
            <span
              class="block h-full bg-indigo-500 rounded-full transition-all"
              :style="{
                width:
                  (data.tickets.last7d[t.key] / ticketsMax7d) * 100 + '%',
              }"
            />
          </span>
        </div>
      </AppStatHero>

      <div
        class="group relative overflow-hidden rounded-xl border bg-(--ui-bg) p-4 transition-all"
        :class="{
          'border-(--ui-border)': syncTone === 'success' || syncTone === 'muted',
          'border-red-500/40': syncTone === 'error',
          'border-amber-500/40': syncTone === 'loading',
        }"
      >
        <div
          class="absolute inset-0 pointer-events-none"
          :class="{
            'bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-transparent':
              syncTone === 'success',
            'bg-gradient-to-br from-red-500/[0.08] via-transparent to-transparent':
              syncTone === 'error',
            'bg-gradient-to-br from-amber-500/[0.06] via-transparent to-transparent':
              syncTone === 'loading',
          }"
        />
        <div class="relative">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] uppercase tracking-wider text-(--ui-text-dimmed) font-medium">
              Интеграция
            </span>
            <span
              v-if="data.sync.integration?.type"
              class="text-[10px] uppercase tracking-wider text-(--ui-text-dimmed) px-1.5 py-0.5 rounded border border-(--ui-border) font-medium"
            >
              {{ data.sync.integration.type }}
            </span>
          </div>
          <div class="flex items-center gap-2 mb-1">
            <span
              class="size-2 rounded-full shrink-0"
              :class="{
                'bg-emerald-500': syncTone === 'success',
                'bg-red-500': syncTone === 'error',
                'bg-amber-500 animate-pulse': syncTone === 'loading',
                'bg-zinc-400': syncTone === 'muted',
              }"
            />
            <span class="text-sm font-medium">{{ syncLabel }}</span>
          </div>
          <div class="text-xs text-(--ui-text-dimmed) tabular-nums mb-3 truncate">
            {{
              fmtRelative(
                data.sync.lastLog?.startedAt ??
                  data.sync.integration?.lastSyncAt,
              )
            }}
            <template v-if="data.sync.lastLog?.durationMs">
              · {{ fmtDuration(data.sync.lastLog.durationMs) }}
            </template>
            <template v-if="data.sync.lastLog?.stats?.units">
              · {{ data.sync.lastLog.stats.units }} лотов
            </template>
          </div>
          <div class="flex items-center gap-1.5">
            <button
              :disabled="
                !data.sync.integration ||
                syncMut.isPending.value ||
                syncTone === 'loading'
              "
              class="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-(--ui-bg-inverted) text-(--ui-text-inverted) text-xs font-medium hover:opacity-90 transition disabled:opacity-30"
              @click="syncMut.mutate()"
            >
              <UIcon
                :name="
                  syncMut.isPending.value || syncTone === 'loading'
                    ? 'i-tabler-loader-2'
                    : 'i-tabler-refresh'
                "
                :class="[
                  'size-3.5',
                  (syncMut.isPending.value || syncTone === 'loading') &&
                    'animate-spin',
                ]"
              />
              Sync
            </button>
            <NuxtLink
              to="/integrations"
              class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text) transition px-2 py-1"
            >
              настройки →
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <AppDataCard
        v-if="data.topProjects.length"
        flush
        class="lg:col-span-2"
      >
        <template #header>
          <h2 class="text-sm font-semibold tracking-tight">
            Топ проектов по продажам
          </h2>
          <span class="text-[11px] text-(--ui-text-dimmed) tabular-nums">
            {{ data.topProjects.length }}
          </span>
        </template>
        <template #actions>
          <NuxtLink
            to="/projects"
            class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text) transition"
          >
            все →
          </NuxtLink>
        </template>
        <div class="divide-y divide-(--ui-border)">
          <NuxtLink
            v-for="(p, i) in data.topProjects"
            :key="p.id"
            :to="`/projects/${p.id}/edit`"
            class="flex items-center gap-3 px-4 py-3 hover:bg-(--ui-bg-elevated) transition group"
          >
            <span
              class="size-7 rounded-md bg-(--ui-bg-elevated) text-[11px] font-semibold flex items-center justify-center text-(--ui-text-muted) tabular-nums shrink-0"
            >
              {{ i + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2 mb-1">
                <span class="text-sm font-medium truncate">{{ p.name }}</span>
                <span class="text-[11px] text-(--ui-text-dimmed) tabular-nums shrink-0">
                  {{ fmtNum(p.sold) }} / {{ fmtNum(p.total) }}
                </span>
              </div>
              <div class="flex h-1 rounded-full overflow-hidden bg-(--ui-bg-elevated)">
                <div
                  class="bg-zinc-400 dark:bg-zinc-500"
                  :style="{ width: p.soldPct + '%' }"
                />
              </div>
            </div>
            <span class="tabular-nums text-sm font-semibold w-12 text-right shrink-0">
              {{ p.soldPct }}%
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-4 text-(--ui-text-dimmed) opacity-0 group-hover:opacity-100 transition shrink-0"
            />
          </NuxtLink>
        </div>
      </AppDataCard>

      <AppDataCard v-if="apt.total" title="Воронка квартир">
        <template #actions>
          <NuxtLink
            to="/apartments"
            class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text) transition"
          >
            →
          </NuxtLink>
        </template>
        <div class="space-y-2">
          <div
            v-for="seg in aptSegments"
            :key="seg.key"
            class="space-y-1"
          >
            <div class="flex items-center gap-2 text-xs">
              <span class="size-2 rounded-sm shrink-0" :class="seg.dot" />
              <span class="text-(--ui-text-muted)">{{ seg.label }}</span>
              <span class="ml-auto tabular-nums font-medium">
                {{ fmtNum(seg.n) }}
              </span>
              <span
                class="text-[11px] text-(--ui-text-dimmed) tabular-nums w-9 text-right"
              >
                {{ Math.round(seg.pct) }}%
              </span>
            </div>
            <div class="h-1 rounded-full bg-(--ui-bg-elevated) overflow-hidden">
              <div
                class="h-full rounded-full"
                :class="seg.bar"
                :style="{ width: seg.pct + '%' }"
              />
            </div>
          </div>
        </div>
      </AppDataCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <AppDataCard flush title="Заявки по типам">
        <template #actions>
          <NuxtLink
            to="/tickets"
            class="text-xs text-(--ui-text-dimmed) hover:text-(--ui-text) transition"
          >
            все →
          </NuxtLink>
        </template>
        <div class="p-2">
          <NuxtLink
            v-for="t in ticketTypes"
            :key="t.key"
            :to="`/tickets?type=${t.key}`"
            class="flex items-center gap-3 px-2.5 py-2 rounded-md hover:bg-(--ui-bg-elevated) transition"
          >
            <span class="size-7 rounded-md bg-(--ui-bg-elevated) flex items-center justify-center shrink-0">
              <UIcon :name="t.icon" class="size-3.5 text-(--ui-text-muted)" />
            </span>
            <span class="text-xs text-(--ui-text-muted) flex-1 min-w-0 truncate">
              {{ t.label }}
            </span>
            <div class="flex items-center gap-3 text-xs tabular-nums">
              <span class="text-(--ui-text-dimmed)">7д</span>
              <span class="w-6 text-right text-(--ui-text-muted)">
                {{ data.tickets.last7d[t.key] }}
              </span>
              <span class="text-(--ui-text-dimmed)">·</span>
              <span class="text-(--ui-text-dimmed)">24ч</span>
              <span
                class="w-6 text-right font-semibold"
                :class="
                  data.tickets.last24h[t.key] > 0
                    ? 'text-(--ui-text)'
                    : 'text-(--ui-text-dimmed)'
                "
              >
                {{ data.tickets.last24h[t.key] }}
              </span>
            </div>
          </NuxtLink>
        </div>
      </AppDataCard>

      <AppDataCard flush title="Черновики">
        <template #actions>
          <AppStatusPill
            v-if="draftsTotal > 0"
            tone="warning"
            :label="String(draftsTotal)"
          />
          <span v-else class="text-[11px] text-(--ui-text-dimmed)">пусто</span>
        </template>

        <div
          v-if="data.drafts.bySite.length > 1"
          class="flex items-center gap-1 px-2 pt-2 overflow-x-auto"
        >
          <button
            v-for="tab in draftTabs"
            :key="tab.id ?? 'all'"
            type="button"
            class="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11.5px] font-medium transition shrink-0"
            :class="
              activeDraftSiteId === tab.id
                ? 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)'
                : 'text-(--ui-text-muted) hover:text-(--ui-text)'
            "
            @click="selectedDraftSiteId = tab.id"
          >
            <UIcon
              v-if="tab.isPrimary"
              name="i-tabler-home-star"
              class="size-3 opacity-70"
            />
            <span class="truncate max-w-[10rem]">{{ tab.label }}</span>
            <span
              v-if="tab.total > 0"
              class="text-[10.5px] tabular-nums"
              :class="tab.id == null ? 'text-(--ui-text-dimmed)' : 'text-amber-600 dark:text-amber-400'"
            >
              {{ tab.total }}
            </span>
          </button>
        </div>

        <div class="p-2">
          <button
            v-for="d in draftItems"
            :key="d.label"
            type="button"
            class="flex items-center gap-3 px-2.5 py-2 rounded-md hover:bg-(--ui-bg-elevated) transition group w-full text-left"
            @click="onDraftItemClick(d.to)"
          >
            <span
              class="size-7 rounded-md flex items-center justify-center shrink-0"
              :class="
                d.n > 0 ? 'bg-amber-500/10' : 'bg-(--ui-bg-elevated)'
              "
            >
              <UIcon
                :name="d.icon"
                class="size-3.5"
                :class="
                  d.n > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-(--ui-text-dimmed)'
                "
              />
            </span>
            <span
              class="text-xs flex-1"
              :class="
                d.n > 0 ? 'text-(--ui-text)' : 'text-(--ui-text-dimmed)'
              "
            >
              {{ d.label }}
            </span>
            <span
              class="tabular-nums text-xs"
              :class="
                d.n > 0
                  ? 'text-(--ui-text) font-semibold'
                  : 'text-(--ui-text-dimmed)'
              "
            >
              {{ d.n }}
            </span>
            <UIcon
              name="i-tabler-chevron-right"
              class="size-3.5 text-(--ui-text-dimmed) opacity-0 group-hover:opacity-100 transition"
            />
          </button>
        </div>
      </AppDataCard>
    </div>
  </div>
</template>
