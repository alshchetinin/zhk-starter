<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const { user } = useSession();
const toast = useToast();
const queryClient = useQueryClient();

const { data, isPending } = useQuery($orpc.dashboard.overview.queryOptions());

// ---------------- Helpers ----------------
function fmtNum(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("ru-RU").format(n);
}
function fmtRelative(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ч назад`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd} дн назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
function fmtDuration(ms: number | null | undefined) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms} мс`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}с`;
  const m = Math.floor(s / 60);
  return `${m}м ${Math.round(s % 60)}с`;
}

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
});

// ---------------- Sync ----------------
const syncTone = computed(() => {
  const sync = data.value?.sync;
  if (!sync?.integration) return "muted" as const;
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
    muted: data.value?.sync.integration ? "Sync не запускался" : "Нет интеграции",
  };
  return m[syncTone.value];
});

const syncMut = useMutation({
  mutationFn: () => {
    const id = data.value?.sync.integration?.id;
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

// ---------------- Apartments ----------------
const apt = computed(() => data.value?.apartments);
const aptSegments = computed(() => {
  const a = apt.value;
  if (!a || !a.total) return [];
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

// ---------------- Tickets ----------------
const ticketTypes = [
  { key: "lead", label: "Лиды", icon: "i-tabler-user-plus" },
  { key: "callback", label: "Перезвонить", icon: "i-tabler-phone-call" },
  { key: "question", label: "Вопросы", icon: "i-tabler-message-circle" },
  { key: "booking", label: "Брони", icon: "i-tabler-bookmark" },
] as const;
const ticketsMax7d = computed(() => {
  if (!data.value) return 1;
  return Math.max(1, ...ticketTypes.map((t) => data.value!.tickets.last7d[t.key]));
});

// ---------------- Drafts ----------------
const draftItems = computed(() => {
  const d = data.value?.drafts;
  if (!d) return [];
  return [
    { label: "Новости", n: d.news, to: "/news", icon: "i-tabler-news" },
    { label: "Акции", n: d.promotions, to: "/promotions", icon: "i-tabler-discount" },
    { label: "Страницы", n: d.pages, to: "/pages", icon: "i-tabler-file-text" },
    { label: "Модалки", n: d.modals, to: "/modals", icon: "i-tabler-app-window" },
    { label: "Ход стройки", n: d.constructionProgress, to: "/projects", icon: "i-tabler-crane" },
  ];
});
const draftsTotal = computed(() => draftItems.value.reduce((s, i) => s + i.n, 0));
</script>

<template>
  <div class="w-full px-6 py-6 max-w-[1400px] mx-auto">
    <!-- Header -->
    <header class="flex items-end justify-between mb-7 gap-4 flex-wrap">
      <div class="min-w-0">
        <p class="text-xs text-(--ui-text-dimmed) mb-1 tracking-wide">
          {{ new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" }) }}
        </p>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ greeting }}{{ user?.name ? `, ${user.name.split(" ")[0]}` : "" }}
        </h1>
      </div>

      <div class="flex items-center gap-1.5">
        <AppToolbarButton to="/projects/create" icon="i-tabler-plus">ЖК</AppToolbarButton>
        <AppToolbarButton to="/buildings" icon="i-tabler-plus">Дом</AppToolbarButton>
        <AppToolbarButton to="/news" icon="i-tabler-plus">Новость</AppToolbarButton>
      </div>
    </header>

    <!-- Loading -->
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <div v-else-if="data" class="space-y-4">
      <!-- ============== HERO STATS ============== -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <!-- Apartments hero -->
        <AppStatHero
          to="/apartments"
          label="Квартиры"
          accent="emerald"
        >
          <template #value>{{ fmtNum(apt?.total) }}</template>
          <template #sub>
            <span
              v-if="apt?.total"
              class="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums"
            >
              {{ Math.round(((apt?.free ?? 0) / apt!.total) * 100) }}% свободно
            </span>
          </template>
          <div
            v-if="apt?.total"
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

        <!-- Tickets hero -->
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

        <!-- Sync hero -->
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

      <!-- ============== MAIN GRID ============== -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <!-- LEFT: Top projects (2 cols) -->
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

        <!-- RIGHT: Apartments breakdown -->
        <AppDataCard v-if="apt?.total" title="Воронка квартир">
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

      <!-- ============== SECONDARY GRID ============== -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <!-- Tickets breakdown -->
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

        <!-- Drafts -->
        <AppDataCard flush title="Черновики">
          <template #actions>
            <AppStatusPill
              v-if="draftsTotal > 0"
              tone="warning"
              :label="String(draftsTotal)"
            />
            <span v-else class="text-[11px] text-(--ui-text-dimmed)">пусто</span>
          </template>
          <div class="p-2">
            <NuxtLink
              v-for="d in draftItems"
              :key="d.label"
              :to="d.to"
              class="flex items-center gap-3 px-2.5 py-2 rounded-md hover:bg-(--ui-bg-elevated) transition group"
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
            </NuxtLink>
          </div>
        </AppDataCard>
      </div>
    </div>
  </div>
</template>
