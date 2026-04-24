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
  stack: FormStack,
  apt: FormApartment,
  floor: number,
  sequentialIdx: number,
): string {
  if (numberingScheme.value === "sequential") return String(sequentialIdx);
  if (numberingScheme.value === "section-prefix")
    return `${sectionPrefix.value}-${floor}-${String(apt.number).padStart(2, "0")}`;
  return String(floor * 100 + apt.number);
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

const preview = computed<PreviewFloor[]>(() => {
  const byFloor = new Map<number, PreviewCell[]>();
  // For sequential numbering: assign one counter per floor position in sorted order
  let seq = 0;
  // iterate stacks in order, floor asc, apartments in listed order
  for (const stack of stacks) {
    const lo = Math.min(stack.startFloor, stack.endFloor);
    const hi = Math.max(stack.startFloor, stack.endFloor);
    for (let f = lo; f <= hi; f++) {
      if (!byFloor.has(f)) byFloor.set(f, []);
      for (const apt of stack.apartments) {
        seq += 1;
        byFloor.get(f)!.push({
          stackId: stack.id,
          apartmentId: apt.id,
          apartmentNumber: computeApartmentNumber(stack, apt, f, seq),
          roomsCount: apt.roomsCount,
          area: apt.area,
          conflict: occupiedFloors.value.has(f),
        });
      }
    }
  }
  return [...byFloor.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([floorNumber, apartments]) => ({ floorNumber, apartments }));
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

// ---------------- Colors per stack ----------------
const stackPalette = [
  "bg-sky-50 dark:bg-sky-950 border-l-sky-400",
  "bg-emerald-50 dark:bg-emerald-950 border-l-emerald-400",
  "bg-amber-50 dark:bg-amber-950 border-l-amber-400",
  "bg-violet-50 dark:bg-violet-950 border-l-violet-400",
  "bg-rose-50 dark:bg-rose-950 border-l-rose-400",
  "bg-teal-50 dark:bg-teal-950 border-l-teal-400",
];
function stackColor(i: number) {
  return stackPalette[i % stackPalette.length];
}
function stackCellColor(i: number) {
  // preview cells
  const cells = [
    "bg-sky-100 border-sky-300 dark:bg-sky-900 dark:border-sky-700",
    "bg-emerald-100 border-emerald-300 dark:bg-emerald-900 dark:border-emerald-700",
    "bg-amber-100 border-amber-300 dark:bg-amber-900 dark:border-amber-700",
    "bg-violet-100 border-violet-300 dark:bg-violet-900 dark:border-violet-700",
    "bg-rose-100 border-rose-300 dark:bg-rose-900 dark:border-rose-700",
    "bg-teal-100 border-teal-300 dark:bg-teal-900 dark:border-teal-700",
  ];
  return cells[i % cells.length];
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
  <PageContainer>
    <UBreadcrumb
      :items="[
        { label: 'Дома', to: '/buildings', icon: 'i-tabler-building-skyscraper' },
        { label: building?.name ?? '...', to: `/buildings/${buildingId}` },
        { label: 'Заполнить секцию' },
      ]"
      class="mb-6"
    />

    <div class="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-bold">Заполнить секцию</h1>
        <p v-if="draft?.savedAt" class="text-xs text-(--ui-text-muted) mt-1">
          Черновик сохранён {{ new Date(draft.savedAt).toLocaleTimeString("ru-RU") }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          v-if="draft"
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-tabler-trash"
          @click="clearDraft"
        >
          Очистить черновик
        </UButton>
      </div>
    </div>

    <div
      class="grid gap-6"
      :class="previewCollapsed ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[1fr_400px]'"
    >
      <!-- FORM -->
      <div class="space-y-6">
        <!-- Section target -->
        <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 space-y-3">
          <div class="flex gap-2 flex-wrap">
            <UButton
              :variant="useExistingSection ? 'outline' : 'solid'"
              :color="useExistingSection ? 'neutral' : 'primary'"
              size="sm"
              class="rounded-lg"
              @click="useExistingSection = false"
            >
              Новая секция
            </UButton>
            <UButton
              :variant="useExistingSection ? 'solid' : 'outline'"
              :color="useExistingSection ? 'primary' : 'neutral'"
              size="sm"
              :disabled="!sectionItems.length"
              class="rounded-lg"
              @click="useExistingSection = true"
            >
              Дополнить существующую
            </UButton>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField v-if="!useExistingSection" label="Название секции" required>
              <UInput v-model="sectionName" placeholder="Секция 1" autofocus />
            </UFormField>
            <UFormField v-else label="Секция" required>
              <USelect
                v-model="selectedSectionId"
                :items="sectionItems"
                placeholder="—"
              />
            </UFormField>
            <UFormField label="Схема нумерации">
              <USelect v-model="numberingScheme" :items="schemeItems" />
            </UFormField>
          </div>

          <div
            v-if="useExistingSection && occupiedFloors.size"
            class="text-xs text-(--ui-text-muted)"
          >
            Занятые этажи:
            {{ [...occupiedFloors].sort((a: number, b: number) => a - b).join(", ") }}
          </div>
        </div>

        <!-- Overlap warnings -->
        <UAlert
          v-if="overlapErrors.length"
          color="error"
          variant="subtle"
          icon="i-tabler-alert-triangle"
          title="Пересечения стояков"
          :description="overlapErrors.join('; ')"
        />
        <UAlert
          v-if="conflictCount > 0"
          color="warning"
          variant="subtle"
          icon="i-tabler-alert-circle"
          title="Конфликт с существующими квартирами"
          :description="`На ${conflictCount} этажах уже есть квартиры. Снимите конфликт, сдвинув диапазон или выбрав новую секцию.`"
        />

        <!-- Presets -->
        <div class="rounded-lg border border-dashed border-(--ui-border) p-3">
          <div class="text-xs text-(--ui-text-muted) mb-2">Быстрые пресеты:</div>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="(p, i) in presets"
              :key="i"
              :icon="p.icon"
              variant="outline"
              color="neutral"
              size="xs"
              class="rounded-lg"
              @click="applyPreset(i)"
            >
              {{ p.label }}
            </UButton>
          </div>
        </div>

        <!-- Stacks -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Стояки ({{ stacks.length }})</h2>
            <UButton
              icon="i-tabler-plus"
              variant="outline"
              color="neutral"
              size="sm"
              class="rounded-lg"
              @click="addStack"
            >
              Добавить стояк
            </UButton>
          </div>

          <TransitionGroup
            name="stack"
            tag="div"
            class="space-y-4"
          >
            <div
              v-for="(stack, si) in stacks"
              :key="stack.id"
              class="rounded-lg border border-l-4 border-(--ui-border) p-4 space-y-3 transition-all"
              :class="stackColor(si)"
            >
              <div class="flex items-center gap-3 flex-wrap">
                <span class="text-sm font-medium">#{{ si + 1 }}</span>
                <span class="text-sm text-(--ui-text-muted)">этажи</span>
                <UInput
                  v-model.number="stack.startFloor"
                  type="number"
                  class="w-20"
                  :ui="
                    stack.startFloor > stack.endFloor ? { base: 'ring-red-500' } : {}
                  "
                />
                <span class="text-sm text-(--ui-text-muted)">—</span>
                <UInput v-model.number="stack.endFloor" type="number" class="w-20" />
                <span class="text-sm text-(--ui-text-muted) ml-auto">
                  {{ Math.max(0, stack.endFloor - stack.startFloor + 1) }} эт. ×
                  {{ stack.apartments.length }} кв. =
                  <b>{{
                    Math.max(0, stack.endFloor - stack.startFloor + 1) *
                    stack.apartments.length
                  }}</b>
                </span>
                <UButton
                  variant="ghost"
                  size="xs"
                  icon="i-tabler-copy"
                  :title="'Дублировать стояк'"
                  @click="duplicateStack(si)"
                />
                <UButton
                  v-if="stacks.length > 1"
                  variant="ghost"
                  size="xs"
                  icon="i-tabler-trash"
                  color="error"
                  :title="'Удалить стояк'"
                  @click="removeStack(si)"
                />
              </div>

              <div
                v-if="stackErrors[stack.id]"
                class="text-xs text-red-600 dark:text-red-400"
              >
                {{ stackErrors[stack.id].join("; ") }}
              </div>

              <div class="border-t border-(--ui-border) pt-3 space-y-2">
                <div class="text-xs text-(--ui-text-muted) mb-1">
                  Квартиры на этаже
                </div>
                <TransitionGroup name="apt" tag="div" class="space-y-2">
                  <div
                    v-for="(apt, ai) in stack.apartments"
                    :key="apt.id"
                    :data-apt-id="apt.id"
                    class="flex items-center gap-2 rounded-md p-1.5 transition-shadow"
                    :class="
                      highlightedAptId === apt.id
                        ? 'bg-(--ui-primary)/10 ring-1 ring-(--ui-primary)'
                        : ''
                    "
                  >
                    <div class="flex flex-col">
                      <UButton
                        variant="ghost"
                        size="xs"
                        icon="i-tabler-chevron-up"
                        :disabled="ai === 0"
                        @click="moveApartment(stack, ai, -1)"
                      />
                      <UButton
                        variant="ghost"
                        size="xs"
                        icon="i-tabler-chevron-down"
                        :disabled="ai === stack.apartments.length - 1"
                        @click="moveApartment(stack, ai, 1)"
                      />
                    </div>
                    <UFormField label="№" :ui="{ label: 'text-xs' }">
                      <UInput
                        v-model.number="apt.number"
                        type="number"
                        min="1"
                        class="w-16"
                      />
                    </UFormField>
                    <UFormField label="Комнат" :ui="{ label: 'text-xs' }">
                      <UInput
                        v-model.number="apt.roomsCount"
                        type="number"
                        min="0"
                        class="w-20"
                      />
                    </UFormField>
                    <UFormField label="Площадь, м²" :ui="{ label: 'text-xs' }">
                      <UInput
                        v-model.number="apt.area"
                        type="number"
                        step="0.01"
                        min="0"
                        class="w-24"
                        @keyup.enter="
                          ai === stack.apartments.length - 1 &&
                            addApartment(stack)
                        "
                      />
                    </UFormField>
                    <UBadge
                      variant="subtle"
                      color="neutral"
                      class="mb-0.5 self-end"
                    >
                      {{ roomsLabel(apt.roomsCount) }} · {{ apt.area }}м²
                    </UBadge>
                    <UButton
                      v-if="stack.apartments.length > 1"
                      variant="ghost"
                      size="xs"
                      icon="i-tabler-x"
                      color="error"
                      class="self-end mb-1.5 ml-auto"
                      @click="removeApartment(stack, ai)"
                    />
                  </div>
                </TransitionGroup>
                <UButton
                  variant="ghost"
                  size="xs"
                  icon="i-tabler-plus"
                  @click="addApartment(stack)"
                >
                  Добавить квартиру
                </UButton>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <div
          class="flex items-center justify-between pt-4 border-t border-(--ui-border) flex-wrap gap-3"
        >
          <div class="text-sm text-(--ui-text-muted) flex flex-wrap items-center gap-3">
            <span>
              Будет создано: <b>{{ totalApartments }}</b> кв.,
              <b>{{ uniqueLayoutsCount }}</b> планировок
            </span>
            <span v-if="countsByRooms.length" class="flex gap-1.5 flex-wrap">
              <UBadge
                v-for="[rooms, n] in countsByRooms"
                :key="rooms"
                variant="subtle"
                color="neutral"
              >
                {{ roomsLabel(rooms) }}: {{ n }}
              </UBadge>
            </span>
            <span v-if="totalApartments > 0" class="text-xs">{{ eta }}</span>
          </div>
          <div class="flex gap-2">
            <UButton
              variant="outline"
              class="rounded-xl"
              @click="router.push(`/buildings/${buildingId}`)"
            >
              Отмена
            </UButton>
            <UButton
              :loading="createMut.isPending.value"
              :disabled="!canSubmit"
              class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
              @click="submit"
            >
              Создать
              <span class="opacity-60 ml-1 text-xs">⌘↵</span>
            </UButton>
          </div>
        </div>
      </div>

      <!-- PREVIEW -->
      <div v-if="!previewCollapsed" class="lg:sticky lg:top-4 self-start">
        <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg) shadow-sm">
          <div
            class="border-b border-(--ui-border) px-4 py-3 flex items-center justify-between gap-2"
          >
            <div>
              <h3 class="text-sm font-semibold">Превью шахматки</h3>
              <p class="text-xs text-(--ui-text-muted) mt-0.5">
                {{ totalApartments }} кв., клик → подсветить в форме
              </p>
            </div>
            <UButton
              variant="ghost"
              size="xs"
              icon="i-tabler-layout-sidebar-right-collapse"
              @click="previewCollapsed = true"
            />
          </div>
          <div class="space-y-1 p-2 max-h-[70vh] overflow-auto">
            <div
              v-for="floor in preview"
              :key="floor.floorNumber"
              class="flex items-center gap-2 rounded-lg p-1.5"
            >
              <div
                class="flex size-8 shrink-0 items-center justify-center rounded-md bg-(--ui-bg-elevated) text-xs font-medium text-(--ui-text-muted)"
              >
                {{ floor.floorNumber }}
              </div>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="(apt, i) in floor.apartments"
                  :key="i"
                  :title="`№${apt.apartmentNumber} · ${roomsLabel(apt.roomsCount)} · ${apt.area} м²${apt.conflict ? ' · КОНФЛИКТ' : ''}`"
                  class="flex flex-col items-center justify-center size-12 rounded border text-[10px] transition hover:scale-110"
                  :class="
                    apt.conflict
                      ? 'bg-red-100 border-red-400 dark:bg-red-900 dark:border-red-700'
                      : stackCellColor(stackIndexById.get(apt.stackId) ?? 0)
                  "
                  @click="onPreviewClick(apt)"
                >
                  <span class="font-medium">{{ apt.apartmentNumber }}</span>
                  <span class="text-(--ui-text-muted)">
                    {{ roomsLabel(apt.roomsCount) }}
                  </span>
                </button>
              </div>
            </div>
            <div
              v-if="!preview.length"
              class="text-center text-xs text-(--ui-text-muted) py-4"
            >
              Добавьте хотя бы один стояк
            </div>
          </div>
        </div>
      </div>

      <UButton
        v-else
        class="self-start"
        variant="outline"
        color="neutral"
        icon="i-tabler-layout-sidebar-right-expand"
        @click="previewCollapsed = false"
      >
        Показать превью ({{ totalApartments }})
      </UButton>
    </div>
  </PageContainer>
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
