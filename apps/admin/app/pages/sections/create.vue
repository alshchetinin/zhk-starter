<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { StorageSerializers, useStorage, useEventListener, watchDebounced } from "@vueuse/core";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();
const route = useRoute();
const router = useRouter();

const buildingId = computed(() => (route.query.buildingId as string) || "");
const initialSectionId = computed(() => (route.query.sectionId as string) || "");

const { data: building } = useQuery(
  computed(() =>
    $orpc.buildings.getById.queryOptions({ input: { id: buildingId.value } }),
  ),
);

// ---------------- Types ----------------
type FormApartment = {
  id: string;
  number: number;
  roomsCount: number;
  area: number;
};
type FormStack = {
  id: string;
  startFloor: number;
  endFloor: number;
  apartments: FormApartment[];
};
type NumberingScheme = "floor-prefix" | "sequential" | "section-prefix";

// ---------------- Mode ----------------
const useExistingSection = ref(!!initialSectionId.value);
const selectedSectionId = ref(initialSectionId.value);
const sectionName = ref("");

// ---------------- Draft (localStorage) ----------------
const draftKey = computed(() => `fill-section-draft:${buildingId.value}`);
const draft = useStorage<{
  stacks: FormStack[];
  numberingScheme: NumberingScheme;
  sectionName: string;
  useExistingSection: boolean;
  selectedSectionId: string;
  savedAt: number;
} | null>(draftKey, null, undefined, { serializer: StorageSerializers.object });

function freshApt(number = 1, roomsCount = 1, area = 40): FormApartment {
  return { id: crypto.randomUUID(), number, roomsCount, area };
}
function freshStack(startFloor = 1, endFloor = 9): FormStack {
  return {
    id: crypto.randomUUID(),
    startFloor,
    endFloor,
    apartments: [freshApt(1, 1, 40), freshApt(2, 2, 60)],
  };
}

const stacks = reactive<FormStack[]>(
  draft.value?.stacks?.length
    ? JSON.parse(JSON.stringify(draft.value.stacks))
    : [freshStack()],
);
const numberingScheme = ref<NumberingScheme>(
  draft.value?.numberingScheme ?? "floor-prefix",
);

if (draft.value?.sectionName) sectionName.value = draft.value.sectionName;
if (draft.value?.useExistingSection != null)
  useExistingSection.value = draft.value.useExistingSection;
if (draft.value?.selectedSectionId)
  selectedSectionId.value = draft.value.selectedSectionId;

watchDebounced(
  [stacks, numberingScheme, sectionName, useExistingSection, selectedSectionId],
  () => {
    draft.value = {
      stacks: JSON.parse(JSON.stringify(stacks)),
      numberingScheme: numberingScheme.value,
      sectionName: sectionName.value,
      useExistingSection: useExistingSection.value,
      selectedSectionId: selectedSectionId.value,
      savedAt: Date.now(),
    };
  },
  { debounce: 300, deep: true },
);

function clearDraft() {
  draft.value = null;
  stacks.splice(0, stacks.length, freshStack());
  numberingScheme.value = "floor-prefix";
  sectionName.value = "";
  toast.add({ title: "Черновик очищен" });
}

// ---------------- Mutations on stacks ----------------
function addStack() {
  const last = stacks[stacks.length - 1];
  const start = last ? last.endFloor + 1 : 1;
  stacks.push(freshStack(start, start + 5));
}
function removeStack(idx: number) {
  if (stacks.length === 1) return;
  stacks.splice(idx, 1);
}
function duplicateStack(idx: number) {
  const src = stacks[idx];
  if (!src) return;
  const span = src.endFloor - src.startFloor + 1;
  const copy: FormStack = {
    id: crypto.randomUUID(),
    startFloor: src.endFloor + 1,
    endFloor: src.endFloor + span,
    apartments: src.apartments.map((a) => ({ ...a, id: crypto.randomUUID() })),
  };
  stacks.splice(idx + 1, 0, copy);
}
function addApartment(stack: FormStack) {
  const nextNumber = (stack.apartments.at(-1)?.number ?? 0) + 1;
  stack.apartments.push(freshApt(nextNumber, 1, 40));
}
function removeApartment(stack: FormStack, idx: number) {
  if (stack.apartments.length === 1) return;
  stack.apartments.splice(idx, 1);
}
function moveApartment(stack: FormStack, idx: number, dir: -1 | 1) {
  const j = idx + dir;
  if (j < 0 || j >= stack.apartments.length) return;
  const tmp = stack.apartments[idx]!;
  stack.apartments[idx] = stack.apartments[j]!;
  stack.apartments[j] = tmp;
}

// ---------------- Presets ----------------
const presets: { label: string; icon: string; factory: () => FormStack }[] = [
  {
    label: "Студии ×10 эт.",
    icon: "i-tabler-home",
    factory: () => ({
      id: crypto.randomUUID(),
      startFloor: 1,
      endFloor: 10,
      apartments: [
        freshApt(1, 0, 28),
        freshApt(2, 0, 28),
        freshApt(3, 0, 30),
        freshApt(4, 0, 30),
      ],
    }),
  },
  {
    label: "Двухкомнатная башня 1–25",
    icon: "i-tabler-building-skyscraper",
    factory: () => ({
      id: crypto.randomUUID(),
      startFloor: 1,
      endFloor: 25,
      apartments: [freshApt(1, 2, 55), freshApt(2, 2, 65)],
    }),
  },
  {
    label: "Смешанный 1к/2к/3к 2–16",
    icon: "i-tabler-layout-grid",
    factory: () => ({
      id: crypto.randomUUID(),
      startFloor: 2,
      endFloor: 16,
      apartments: [
        freshApt(1, 1, 38),
        freshApt(2, 2, 58),
        freshApt(3, 2, 62),
        freshApt(4, 3, 85),
      ],
    }),
  },
];
function applyPreset(i: number) {
  const p = presets[i];
  if (!p) return;
  stacks.push(p.factory());
}

// ---------------- Section existing info ----------------
const sectionItems = computed(() =>
  (building.value?.sections ?? []).map((s: any) => ({
    label: s.name,
    value: s.id,
  })),
);

const { data: existingApts } = useQuery(
  computed(() => ({
    ...$orpc.apartments.listByBuilding.queryOptions({
      input: { buildingId: buildingId.value },
    }),
    enabled: useExistingSection.value && !!selectedSectionId.value,
  })),
);

const occupiedFloors = computed(() => {
  if (!useExistingSection.value || !selectedSectionId.value) return new Set<number>();
  return new Set(
    (existingApts.value ?? [])
      .filter((a: any) => a.sectionId === selectedSectionId.value)
      .map((a: any) => a.floorNumber as number),
  );
});

// ---------------- Numbering ----------------
const sectionPrefix = computed(() => {
  if (useExistingSection.value) {
    const s = (building.value?.sections ?? []).find(
      (s: any) => s.id === selectedSectionId.value,
    );
    return ((s?.name as string) || "А").slice(0, 2).toUpperCase();
  }
  return (sectionName.value || "С").slice(0, 2).toUpperCase();
});

function computeApartmentNumber(
  _stack: FormStack,
  _apt: FormApartment,
  floor: number,
  sequentialIdx: number,
  positionOnFloor: number,
): string {
  if (numberingScheme.value === "sequential") return String(sequentialIdx);
  if (numberingScheme.value === "section-prefix")
    return `${sectionPrefix.value}-${floor}-${String(positionOnFloor).padStart(2, "0")}`;
  return String(floor * 100 + positionOnFloor);
}

// ---------------- Preview ----------------
type PreviewCell = {
  stackId: string;
  apartmentId: string;
  apartmentNumber: string;
  roomsCount: number;
  area: number;
  conflict: boolean;
};
type PreviewFloor = {
  floorNumber: number;
  apartments: PreviewCell[];
};

// Iterate floors TOP-DOWN across all stacks so numbering is per-floor
// (stack order defines position on each floor).
type NumberedCell = PreviewCell;
function buildFloorNumbering(): {
  byFloor: Map<number, NumberedCell[]>;
  byKey: Map<string, NumberedCell>;
} {
  const byFloor = new Map<number, NumberedCell[]>();
  const byKey = new Map<string, NumberedCell>();
  if (!stacks.length) return { byFloor, byKey };
  const lo = Math.min(...stacks.map((s) => Math.min(s.startFloor, s.endFloor)));
  const hi = Math.max(...stacks.map((s) => Math.max(s.startFloor, s.endFloor)));
  let seq = 0;
  for (let f = lo; f <= hi; f++) {
    let pos = 0;
    const cells: NumberedCell[] = [];
    for (const stack of stacks) {
      const sLo = Math.min(stack.startFloor, stack.endFloor);
      const sHi = Math.max(stack.startFloor, stack.endFloor);
      if (f < sLo || f > sHi) continue;
      for (const apt of stack.apartments) {
        pos += 1;
        seq += 1;
        const cell: NumberedCell = {
          stackId: stack.id,
          apartmentId: apt.id,
          apartmentNumber: computeApartmentNumber(stack, apt, f, seq, pos),
          roomsCount: apt.roomsCount,
          area: apt.area,
          conflict: occupiedFloors.value.has(f),
        };
        cells.push(cell);
        byKey.set(`${stack.id}-${f}-${apt.id}`, cell);
      }
    }
    if (cells.length) byFloor.set(f, cells);
  }
  return { byFloor, byKey };
}

const preview = computed<PreviewFloor[]>(() => {
  const { byFloor } = buildFloorNumbering();
  return [...byFloor.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([floorNumber, apartments]) => ({ floorNumber, apartments }));
});

// Preview grid: stacks as columns, floors as rows
type PreviewGridCell = PreviewCell | null;
type PreviewGridRow = {
  floorNumber: number;
  byStack: PreviewCell[][]; // index corresponds to stacks order
};

const previewGrid = computed<PreviewGridRow[]>(() => {
  if (!stacks.length) return [];
  const { byKey } = buildFloorNumbering();
  const globalLo = Math.min(...stacks.map((s) => Math.min(s.startFloor, s.endFloor)));
  const globalHi = Math.max(...stacks.map((s) => Math.max(s.startFloor, s.endFloor)));
  const rows: PreviewGridRow[] = [];
  for (let f = globalHi; f >= globalLo; f--) {
    const byStack: PreviewCell[][] = stacks.map((stack) => {
      const lo = Math.min(stack.startFloor, stack.endFloor);
      const hi = Math.max(stack.startFloor, stack.endFloor);
      if (f < lo || f > hi) return [];
      return stack.apartments
        .map((apt) => byKey.get(`${stack.id}-${f}-${apt.id}`))
        .filter((c): c is PreviewCell => !!c);
    });
    rows.push({ floorNumber: f, byStack });
  }
  return rows;
});

const totalApartments = computed(() =>
  preview.value.reduce((sum, f) => sum + f.apartments.length, 0),
);

const uniqueLayoutsCount = computed(() => {
  const set = new Set<string>();
  for (const s of stacks)
    for (const a of s.apartments) set.add(`${a.roomsCount}-${a.area}`);
  return set.size;
});

const countsByRooms = computed(() => {
  const map = new Map<number, number>();
  for (const f of preview.value) {
    for (const a of f.apartments) {
      map.set(a.roomsCount, (map.get(a.roomsCount) ?? 0) + 1);
    }
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
});

function roomsLabel(rooms: number) {
  return rooms === 0 ? "Студия" : `${rooms}к`;
}

// ---------------- Validation ----------------
const stackErrors = computed(() => {
  const errors: Record<string, string[]> = {};
  for (const s of stacks) {
    const errs: string[] = [];
    if (s.startFloor > s.endFloor) errs.push("Этажи: начало больше конца");
    if (!s.apartments.length) errs.push("Нет квартир");
    for (const a of s.apartments) {
      if (a.area <= 0) errs.push("Площадь должна быть > 0");
      if (a.number < 1) errs.push("Номер должен быть ≥ 1");
    }
    // dup numbers within stack
    const nums = s.apartments.map((a) => a.number);
    if (new Set(nums).size !== nums.length) errs.push("Повторяются номера");
    if (errs.length) errors[s.id] = errs;
  }
  return errors;
});

const overlapErrors = computed(() => {
  const errs: string[] = [];
  const seen = new Map<number, string>();
  for (const s of stacks) {
    const lo = Math.min(s.startFloor, s.endFloor);
    const hi = Math.max(s.startFloor, s.endFloor);
    for (let f = lo; f <= hi; f++) {
      if (seen.has(f) && seen.get(f) !== s.id) {
        errs.push(`Этаж ${f} пересекается между стояками`);
        break;
      }
      seen.set(f, s.id);
    }
  }
  return errs;
});

const conflictCount = computed(
  () => preview.value.filter((f) => f.apartments.some((a) => a.conflict)).length,
);

const canSubmit = computed(() => {
  if (!buildingId.value) return false;
  if (useExistingSection.value && !selectedSectionId.value) return false;
  if (!useExistingSection.value && !sectionName.value.trim()) return false;
  if (Object.keys(stackErrors.value).length) return false;
  if (overlapErrors.value.length) return false;
  if (conflictCount.value > 0) return false;
  return true;
});

// ---------------- Highlight ----------------
const highlightedAptId = ref<string | null>(null);
function onPreviewClick(cell: PreviewCell) {
  highlightedAptId.value = cell.apartmentId;
  setTimeout(() => {
    const el = document.querySelector(
      `[data-apt-id="${cell.apartmentId}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.classList.add("ring-2", "ring-primary");
    setTimeout(() => el?.classList.remove("ring-2", "ring-primary"), 1500);
  }, 50);
}

// ---------------- Colors per stack (Linear-style: thin accent bar only) ----------------
const stackAccents = [
  { bar: "bg-sky-500", dot: "bg-sky-500", cell: "border-sky-400/60" },
  { bar: "bg-emerald-500", dot: "bg-emerald-500", cell: "border-emerald-400/60" },
  { bar: "bg-amber-500", dot: "bg-amber-500", cell: "border-amber-400/60" },
  { bar: "bg-violet-500", dot: "bg-violet-500", cell: "border-violet-400/60" },
  { bar: "bg-rose-500", dot: "bg-rose-500", cell: "border-rose-400/60" },
  { bar: "bg-teal-500", dot: "bg-teal-500", cell: "border-teal-400/60" },
];
function stackAccent(i: number) {
  return stackAccents[i % stackAccents.length]!;
}
const stackIndexById = computed(() => {
  const m = new Map<string, number>();
  stacks.forEach((s, i) => m.set(s.id, i));
  return m;
});

// ---------------- Preview collapse ----------------
const previewCollapsed = ref(false);

// ---------------- Submit ----------------
const createMut = useMutation({
  mutationFn: () => {
    const payloadStacks = stacks.map((s) => ({
      startFloor: s.startFloor,
      endFloor: s.endFloor,
      apartments: s.apartments.map((a) => {
        const customNumbers: Record<string, string> = {};
        const lo = Math.min(s.startFloor, s.endFloor);
        const hi = Math.max(s.startFloor, s.endFloor);
        for (let f = lo; f <= hi; f++) {
          const cell = preview.value
            .find((p) => p.floorNumber === f)
            ?.apartments.find((x) => x.apartmentId === a.id);
          if (cell) customNumbers[String(f)] = cell.apartmentNumber;
        }
        return {
          number: a.number,
          roomsCount: a.roomsCount,
          area: a.area,
          customNumbers,
        };
      }),
    }));

    return $orpcClient.sections.createStructure({
      buildingId: buildingId.value,
      sectionId: useExistingSection.value ? selectedSectionId.value : null,
      sectionName: useExistingSection.value
        ? undefined
        : sectionName.value.trim(),
      stacks: payloadStacks,
    });
  },
  onSuccess: (res) => {
    toast.add({
      title: "Секция создана",
      description: `${res.totalFloors} эт., ${res.totalApartments} кв.`,
      color: "success",
    });
    draft.value = null;
    queryClient.invalidateQueries({ queryKey: $orpc.buildings.key() });
    queryClient.invalidateQueries({ queryKey: $orpc.sections.key() });
    queryClient.invalidateQueries({ queryKey: $orpc.apartments.key() });
    router.push(`/buildings/${buildingId.value}`);
  },
  onError: (e: any) => {
    toast.add({ title: "Ошибка", description: e.message, color: "error" });
  },
});

function submit() {
  if (!canSubmit.value) return;
  createMut.mutate();
}

// Estimated duration (rough): 0.1s per apartment + baseline
const eta = computed(() => {
  const secs = Math.max(1, Math.round(totalApartments.value * 0.02));
  return `≈ ${secs}с`;
});

// Keyboard shortcut: Ctrl/Cmd + Enter → submit
useEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    if (canSubmit.value) submit();
  }
});

const numberingSchemeItems = [
  { label: "Этаж×100 + № (101, 102...)", value: "floor-prefix" },
  { label: "Сквозная (1, 2, 3...)", value: "sequential" },
  { label: "Префикс секции (А-1-01)", value: "section-prefix" },
];

const schemeItems = computed(() => numberingSchemeItems);
</script>

<template>
  <div class="w-full px-6 py-5">
    <!-- Compact header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3 min-w-0">
        <button
          class="text-(--ui-text-muted) hover:text-(--ui-text) transition"
          @click="router.push(`/buildings/${buildingId}`)"
        >
          <UIcon name="i-tabler-arrow-left" class="size-4" />
        </button>
        <div class="flex items-center gap-1.5 text-xs text-(--ui-text-muted) min-w-0">
          <NuxtLink to="/buildings" class="hover:text-(--ui-text)">Дома</NuxtLink>
          <UIcon name="i-tabler-chevron-right" class="size-3" />
          <NuxtLink
            :to="`/buildings/${buildingId}`"
            class="hover:text-(--ui-text) truncate"
          >
            {{ building?.name ?? "…" }}
          </NuxtLink>
          <UIcon name="i-tabler-chevron-right" class="size-3 shrink-0" />
          <span class="text-(--ui-text) font-medium truncate">Заполнить секцию</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span
          v-if="draft?.savedAt"
          class="text-[11px] text-(--ui-text-dimmed) flex items-center gap-1"
        >
          <UIcon name="i-tabler-cloud-check" class="size-3" />
          {{ new Date(draft.savedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) }}
        </span>
        <button
          v-if="draft"
          class="text-[11px] text-(--ui-text-dimmed) hover:text-(--ui-text) transition"
          @click="clearDraft"
        >
          Очистить черновик
        </button>
      </div>
    </div>

    <div
      class="grid gap-5"
      :class="previewCollapsed ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[1fr_360px]'"
    >
      <!-- PREVIEW column (main) -->
      <section
        v-if="!previewCollapsed"
        class="min-w-0 order-2 lg:order-1"
      >
        <div class="rounded-md border border-(--ui-border) bg-(--ui-bg) overflow-hidden">
          <div
            class="flex items-center justify-between gap-2 px-3 py-2 border-b border-(--ui-border) bg-(--ui-bg-elevated)/50"
          >
            <div class="flex items-center gap-3">
              <h2 class="text-xs font-semibold tracking-tight">Шахматка</h2>
              <span class="text-[11px] text-(--ui-text-dimmed) tabular-nums">
                {{ totalApartments }} кв. · {{ previewGrid.length }} эт.
              </span>
              <!-- Stack legend -->
              <div class="hidden sm:flex items-center gap-2">
                <div
                  v-for="(stack, i) in stacks"
                  :key="stack.id"
                  class="flex items-center gap-1 text-[11px] text-(--ui-text-muted)"
                >
                  <span
                    class="size-2 rounded-sm"
                    :class="stackAccent(i).bar"
                  />
                  <span>
                    #{{ i + 1 }} · {{ stack.startFloor }}–{{ stack.endFloor }}
                  </span>
                </div>
              </div>
            </div>
            <button
              class="p-1 rounded text-(--ui-text-dimmed) hover:text-(--ui-text) hover:bg-(--ui-bg-elevated) transition"
              title="Скрыть превью"
              @click="previewCollapsed = true"
            >
              <UIcon name="i-tabler-eye-off" class="size-3.5" />
            </button>
          </div>

          <div
            v-if="!previewGrid.length"
            class="py-16 text-center text-xs text-(--ui-text-dimmed)"
          >
            Добавьте стояк в правой панели
          </div>

          <div
            v-else
            class="p-3 overflow-auto max-h-[calc(100vh-140px)]"
          >
            <div class="inline-block min-w-full">
              <!-- Header row: stacks as column groups -->
              <div
                class="flex items-end sticky top-0 bg-(--ui-bg) pb-1.5 border-b border-(--ui-border) z-10"
              >
                <div class="w-10 shrink-0" />
                <div
                  v-for="(stack, si) in stacks"
                  :key="stack.id"
                  class="px-1.5 flex items-center gap-1.5 border-l border-(--ui-border) first:border-l-0 min-w-[120px]"
                >
                  <span
                    class="size-2 rounded-sm"
                    :class="stackAccent(si).bar"
                  />
                  <span class="text-[11px] font-medium">Стояк #{{ si + 1 }}</span>
                  <span class="text-[10px] text-(--ui-text-dimmed) ml-auto">
                    {{ stack.apartments.length }} кв.
                  </span>
                </div>
              </div>

              <!-- Floor rows -->
              <div>
                <div
                  v-for="row in previewGrid"
                  :key="row.floorNumber"
                  class="flex items-stretch min-h-[56px] hover:bg-(--ui-bg-elevated)/30 transition-colors"
                >
                  <div
                    class="w-10 shrink-0 flex items-center justify-center text-xs font-semibold text-(--ui-text-dimmed) tabular-nums border-r border-(--ui-border)"
                  >
                    {{ row.floorNumber }}
                  </div>
                  <div
                    v-for="(cells, si) in row.byStack"
                    :key="si"
                    class="px-1.5 py-1 flex items-center gap-1 border-l border-(--ui-border) first:border-l-0 min-w-[120px]"
                  >
                    <button
                      v-for="apt in cells"
                      :key="apt.apartmentId"
                      :title="`№${apt.apartmentNumber} · ${roomsLabel(apt.roomsCount)} · ${apt.area} м²${apt.conflict ? ' · КОНФЛИКТ' : ''}`"
                      class="group flex flex-col items-start justify-center h-12 px-2 rounded-md border bg-(--ui-bg) text-left transition hover:-translate-y-0.5 hover:shadow-sm flex-1 min-w-[52px]"
                      :class="[
                        apt.conflict
                          ? 'border-red-400 bg-red-50 dark:bg-red-950/40'
                          : stackAccent(si).cell,
                        highlightedAptId === apt.apartmentId
                          ? 'ring-2 ring-(--ui-primary)'
                          : '',
                      ]"
                      @click="onPreviewClick(apt)"
                    >
                      <span class="text-[11px] font-semibold tabular-nums leading-tight">
                        {{ apt.apartmentNumber }}
                      </span>
                      <span class="text-[10px] text-(--ui-text-dimmed) leading-tight">
                        {{ roomsLabel(apt.roomsCount) }} · {{ apt.area }}м²
                      </span>
                    </button>
                    <div
                      v-if="!cells.length"
                      class="h-12 w-full rounded-md border border-dashed border-(--ui-border)/60"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <button
        v-else
        class="order-2 lg:order-1 self-start flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-(--ui-border) text-xs text-(--ui-text-muted) hover:text-(--ui-text) hover:bg-(--ui-bg-elevated) transition"
        @click="previewCollapsed = false"
      >
        <UIcon name="i-tabler-eye" class="size-3.5" />
        Показать превью
      </button>

      <!-- FORM column (sidebar) -->
      <div class="min-w-0 space-y-4 order-1 lg:order-2">
        <!-- Section target: pill selector + inline fields -->
        <section>
          <div class="mb-2 flex items-center gap-1 rounded-md bg-(--ui-bg-elevated) p-0.5 w-fit text-xs">
            <button
              class="px-2.5 py-1 rounded transition"
              :class="
                !useExistingSection
                  ? 'bg-(--ui-bg) text-(--ui-text) shadow-sm'
                  : 'text-(--ui-text-muted) hover:text-(--ui-text)'
              "
              @click="useExistingSection = false"
            >
              Новая секция
            </button>
            <button
              class="px-2.5 py-1 rounded transition"
              :class="
                useExistingSection
                  ? 'bg-(--ui-bg) text-(--ui-text) shadow-sm'
                  : 'text-(--ui-text-muted) hover:text-(--ui-text)'
              "
              :disabled="!sectionItems.length"
              @click="useExistingSection = true"
            >
              Дополнить существующую
            </button>
          </div>

          <div class="space-y-2">
            <UInput
              v-if="!useExistingSection"
              v-model="sectionName"
              placeholder="Название секции"
              size="sm"
              autofocus
            />
            <USelect
              v-else
              v-model="selectedSectionId"
              :items="sectionItems"
              placeholder="Выберите секцию"
              size="sm"
            />
            <USelect
              v-model="numberingScheme"
              :items="schemeItems"
              size="sm"
              icon="i-tabler-hash"
            />
          </div>

          <div
            v-if="useExistingSection && occupiedFloors.size"
            class="mt-2 text-[11px] text-(--ui-text-dimmed)"
          >
            Занято:
            {{ [...occupiedFloors].sort((a: number, b: number) => a - b).join(", ") }}
          </div>
        </section>

        <!-- Inline warnings -->
        <div v-if="overlapErrors.length || conflictCount > 0" class="space-y-1.5">
          <div
            v-if="overlapErrors.length"
            class="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-md px-3 py-2"
          >
            <UIcon name="i-tabler-alert-triangle" class="size-3.5 mt-0.5 shrink-0" />
            <div>
              <div class="font-medium">Пересечения стояков</div>
              <div class="text-(--ui-text-muted)">{{ overlapErrors.join("; ") }}</div>
            </div>
          </div>
          <div
            v-if="conflictCount > 0"
            class="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-md px-3 py-2"
          >
            <UIcon name="i-tabler-alert-circle" class="size-3.5 mt-0.5 shrink-0" />
            <div>
              <div class="font-medium">Конфликт с существующими квартирами</div>
              <div class="text-(--ui-text-muted)">
                На {{ conflictCount }} этажах уже есть квартиры
              </div>
            </div>
          </div>
        </div>

        <!-- Presets as ghost chips -->
        <div class="flex items-center gap-1.5 flex-wrap text-xs">
          <span class="text-(--ui-text-dimmed) mr-1">Пресеты</span>
          <button
            v-for="(p, i) in presets"
            :key="i"
            class="flex items-center gap-1 px-2 py-1 rounded-md border border-(--ui-border) text-(--ui-text-muted) hover:text-(--ui-text) hover:bg-(--ui-bg-elevated) transition"
            @click="applyPreset(i)"
          >
            <UIcon :name="p.icon" class="size-3" />
            {{ p.label }}
          </button>
        </div>

        <!-- Stacks -->
        <section>
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-baseline gap-2">
              <h2 class="text-sm font-semibold tracking-tight">Стояки</h2>
              <span class="text-xs text-(--ui-text-dimmed)">{{ stacks.length }}</span>
            </div>
            <button
              class="flex items-center gap-1 text-xs text-(--ui-text-muted) hover:text-(--ui-text) transition"
              @click="addStack"
            >
              <UIcon name="i-tabler-plus" class="size-3.5" />
              Стояк
            </button>
          </div>

          <TransitionGroup
            name="stack"
            tag="div"
            class="rounded-md border border-(--ui-border) divide-y divide-(--ui-border) bg-(--ui-bg)"
          >
            <div
              v-for="(stack, si) in stacks"
              :key="stack.id"
              class="relative"
            >
              <!-- Colored accent bar -->
              <div
                class="absolute left-0 top-0 bottom-0 w-0.5"
                :class="stackAccent(si).bar"
              />

              <!-- Stack header row -->
              <div
                class="flex items-center gap-2 px-3 py-2 text-xs"
              >
                <span
                  class="font-medium text-(--ui-text-muted) tabular-nums min-w-[1.75rem]"
                  :class="stackAccent(si).dot.replace('bg-', 'text-')"
                >
                  #{{ si + 1 }}
                </span>
                <span class="text-(--ui-text-dimmed)">этажи</span>
                <UInput
                  v-model.number="stack.startFloor"
                  type="number"
                  size="xs"
                  class="w-16"
                />
                <span class="text-(--ui-text-dimmed)">—</span>
                <UInput
                  v-model.number="stack.endFloor"
                  type="number"
                  size="xs"
                  class="w-16"
                />
                <span class="text-(--ui-text-dimmed) ml-auto tabular-nums">
                  {{ Math.max(0, stack.endFloor - stack.startFloor + 1) }} ×
                  {{ stack.apartments.length }} =
                  <span class="text-(--ui-text) font-medium">{{
                    Math.max(0, stack.endFloor - stack.startFloor + 1) *
                    stack.apartments.length
                  }}</span>
                </span>
                <button
                  class="p-1 rounded text-(--ui-text-dimmed) hover:text-(--ui-text) hover:bg-(--ui-bg-elevated) transition"
                  title="Дублировать"
                  @click="duplicateStack(si)"
                >
                  <UIcon name="i-tabler-copy" class="size-3.5" />
                </button>
                <button
                  v-if="stacks.length > 1"
                  class="p-1 rounded text-(--ui-text-dimmed) hover:text-red-500 hover:bg-(--ui-bg-elevated) transition"
                  title="Удалить"
                  @click="removeStack(si)"
                >
                  <UIcon name="i-tabler-trash" class="size-3.5" />
                </button>
              </div>

              <div
                v-if="stackErrors[stack.id]"
                class="px-3 pb-2 text-[11px] text-red-500"
              >
                {{ stackErrors[stack.id].join(" · ") }}
              </div>

              <!-- Apartments table -->
              <div class="pl-3 pr-2 pb-2 pt-0.5">
                <!-- column headers -->
                <div
                  class="grid grid-cols-[22px_1fr_1fr_auto] gap-1.5 pb-1 text-[10px] uppercase tracking-wider text-(--ui-text-dimmed) px-1"
                >
                  <div></div>
                  <div>Комн.</div>
                  <div>м²</div>
                  <div></div>
                </div>

                <TransitionGroup name="apt" tag="div">
                  <div
                    v-for="(apt, ai) in stack.apartments"
                    :key="apt.id"
                    :data-apt-id="apt.id"
                    class="grid grid-cols-[22px_1fr_1fr_auto] gap-1.5 items-center px-1 py-0.5 rounded transition-colors"
                    :class="
                      highlightedAptId === apt.id
                        ? 'bg-(--ui-primary)/10 ring-1 ring-(--ui-primary)/40'
                        : 'hover:bg-(--ui-bg-elevated)'
                    "
                  >
                    <div class="flex flex-col -my-1">
                      <button
                        class="h-4 text-(--ui-text-dimmed) hover:text-(--ui-text) disabled:opacity-20"
                        :disabled="ai === 0"
                        @click="moveApartment(stack, ai, -1)"
                      >
                        <UIcon name="i-tabler-chevron-up" class="size-3" />
                      </button>
                      <button
                        class="h-4 text-(--ui-text-dimmed) hover:text-(--ui-text) disabled:opacity-20"
                        :disabled="ai === stack.apartments.length - 1"
                        @click="moveApartment(stack, ai, 1)"
                      >
                        <UIcon name="i-tabler-chevron-down" class="size-3" />
                      </button>
                    </div>
                    <UInput
                      v-model.number="apt.roomsCount"
                      type="number"
                      min="0"
                      size="xs"
                    />
                    <UInput
                      v-model.number="apt.area"
                      type="number"
                      step="0.01"
                      min="0"
                      size="xs"
                      @keyup.enter="
                        ai === stack.apartments.length - 1 && addApartment(stack)
                      "
                    />
                    <button
                      v-if="stack.apartments.length > 1"
                      class="p-1 rounded text-(--ui-text-dimmed) hover:text-red-500 transition"
                      @click="removeApartment(stack, ai)"
                    >
                      <UIcon name="i-tabler-x" class="size-3" />
                    </button>
                    <div v-else></div>
                  </div>
                </TransitionGroup>

                <button
                  class="mt-1 flex items-center gap-1 text-[11px] text-(--ui-text-dimmed) hover:text-(--ui-text) transition px-1 py-0.5"
                  @click="addApartment(stack)"
                >
                  <UIcon name="i-tabler-plus" class="size-3" />
                  Квартира
                </button>
              </div>
            </div>
          </TransitionGroup>
        </section>

        <!-- Bottom bar -->
        <div
          class="flex items-center justify-between gap-3 pt-3 flex-wrap text-xs"
        >
          <div class="flex flex-wrap items-center gap-2 text-(--ui-text-muted)">
            <span class="tabular-nums">
              <span class="text-(--ui-text) font-medium">{{ totalApartments }}</span>
              кв. · <span class="text-(--ui-text) font-medium">{{ uniqueLayoutsCount }}</span> план.
            </span>
            <span
              v-for="[rooms, n] in countsByRooms"
              :key="rooms"
              class="text-(--ui-text-dimmed)"
            >
              · {{ roomsLabel(rooms) }} {{ n }}
            </span>
            <span v-if="totalApartments > 0" class="text-(--ui-text-dimmed)">
              · {{ eta }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-1.5 text-xs text-(--ui-text-muted) hover:text-(--ui-text) transition"
              @click="router.push(`/buildings/${buildingId}`)"
            >
              Отмена
            </button>
            <button
              :disabled="!canSubmit || createMut.isPending.value"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-(--ui-bg-inverted) text-(--ui-text-inverted) text-xs font-medium disabled:opacity-40 hover:opacity-90 transition"
              @click="submit"
            >
              <UIcon
                v-if="createMut.isPending.value"
                name="i-tabler-loader-2"
                class="size-3.5 animate-spin"
              />
              Создать
              <kbd class="text-[10px] opacity-60 font-mono">⌘↵</kbd>
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.stack-enter-active,
.stack-leave-active,
.apt-enter-active,
.apt-leave-active {
  transition: all 200ms ease;
}
.stack-enter-from,
.stack-leave-to,
.apt-enter-from,
.apt-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
