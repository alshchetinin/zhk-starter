<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

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

// Mode
const useExistingSection = ref(!!initialSectionId.value);
const selectedSectionId = ref(initialSectionId.value);
const sectionName = ref("");

type FormApartment = {
  number: number;
  roomsCount: number;
  area: number;
};

type FormStack = {
  startFloor: number;
  endFloor: number;
  apartments: FormApartment[];
};

const stacks = reactive<FormStack[]>([
  {
    startFloor: 1,
    endFloor: 9,
    apartments: [
      { number: 1, roomsCount: 1, area: 40 },
      { number: 2, roomsCount: 2, area: 60 },
    ],
  },
]);

function addStack() {
  const last = stacks[stacks.length - 1];
  const start = last ? last.endFloor + 1 : 1;
  stacks.push({
    startFloor: start,
    endFloor: start + 5,
    apartments: [{ number: 1, roomsCount: 1, area: 40 }],
  });
}

function removeStack(idx: number) {
  if (stacks.length === 1) return;
  stacks.splice(idx, 1);
}

function addApartment(stack: FormStack) {
  const nextNumber = (stack.apartments.at(-1)?.number ?? 0) + 1;
  stack.apartments.push({ number: nextNumber, roomsCount: 1, area: 40 });
}

function removeApartment(stack: FormStack, idx: number) {
  if (stack.apartments.length === 1) return;
  stack.apartments.splice(idx, 1);
}

// Sections list for existing section mode
const sectionItems = computed(() =>
  (building.value?.sections ?? []).map((s: any) => ({
    label: s.name,
    value: s.id,
  })),
);

// Live preview — emulate what will be created
type PreviewCell = {
  apartmentNumber: string;
  roomsCount: number;
  area: number;
};
type PreviewFloor = {
  floorNumber: number;
  apartments: PreviewCell[];
};

const preview = computed<PreviewFloor[]>(() => {
  const byFloor = new Map<number, PreviewCell[]>();
  for (const stack of stacks) {
    const lo = Math.min(stack.startFloor, stack.endFloor);
    const hi = Math.max(stack.startFloor, stack.endFloor);
    for (let f = lo; f <= hi; f++) {
      if (!byFloor.has(f)) byFloor.set(f, []);
      for (const apt of stack.apartments) {
        byFloor.get(f)!.push({
          apartmentNumber: String(f * 100 + apt.number),
          roomsCount: apt.roomsCount,
          area: apt.area,
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

const canSubmit = computed(() => {
  if (!buildingId.value) return false;
  if (useExistingSection.value && !selectedSectionId.value) return false;
  if (!useExistingSection.value && !sectionName.value.trim()) return false;
  for (const s of stacks) {
    if (s.startFloor > s.endFloor) return false;
    if (!s.apartments.length) return false;
    for (const a of s.apartments) {
      if (a.area <= 0 || a.number < 1) return false;
    }
  }
  return true;
});

const createMut = useMutation({
  mutationFn: () =>
    $orpcClient.sections.createStructure({
      buildingId: buildingId.value,
      sectionId: useExistingSection.value ? selectedSectionId.value : null,
      sectionName: useExistingSection.value ? undefined : sectionName.value.trim(),
      stacks: stacks.map((s) => ({
        startFloor: s.startFloor,
        endFloor: s.endFloor,
        apartments: s.apartments.map((a) => ({
          number: a.number,
          roomsCount: a.roomsCount,
          area: a.area,
        })),
      })),
    }),
  onSuccess: (res) => {
    toast.add({
      title: "Секция создана",
      description: `${res.totalFloors} эт., ${res.totalApartments} кв.`,
      color: "success",
    });
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

    <h1 class="text-2xl font-bold mb-6">Заполнить секцию</h1>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <!-- FORM -->
      <div class="space-y-6">
        <!-- Section select / new -->
        <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 space-y-3">
          <div class="flex gap-2">
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

          <UFormField v-if="!useExistingSection" label="Название секции" required>
            <UInput v-model="sectionName" placeholder="Секция 1" />
          </UFormField>
          <UFormField v-else label="Секция" required>
            <USelect
              v-model="selectedSectionId"
              :items="sectionItems"
              placeholder="—"
            />
          </UFormField>
        </div>

        <!-- Stacks -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Стояки</h2>
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

          <div
            v-for="(stack, si) in stacks"
            :key="si"
            class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 space-y-3"
          >
            <div class="flex items-center gap-3">
              <span class="text-sm text-(--ui-text-muted)">Этажи с</span>
              <UInput
                v-model.number="stack.startFloor"
                type="number"
                class="w-20"
              />
              <span class="text-sm text-(--ui-text-muted)">по</span>
              <UInput
                v-model.number="stack.endFloor"
                type="number"
                class="w-20"
              />
              <span class="text-sm text-(--ui-text-muted) ml-auto">
                {{ Math.max(0, stack.endFloor - stack.startFloor + 1) }} эт. ×
                {{ stack.apartments.length }} кв. =
                {{
                  Math.max(0, stack.endFloor - stack.startFloor + 1) *
                  stack.apartments.length
                }}
              </span>
              <UButton
                v-if="stacks.length > 1"
                variant="ghost"
                size="xs"
                icon="i-tabler-trash"
                color="error"
                @click="removeStack(si)"
              />
            </div>

            <div class="border-t border-(--ui-border) pt-3 space-y-2">
              <div class="text-xs text-(--ui-text-muted) mb-1">
                Квартиры на этаже (повторяются на каждом этаже стояка)
              </div>
              <div
                v-for="(apt, ai) in stack.apartments"
                :key="ai"
                class="flex items-center gap-2"
              >
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
                  />
                </UFormField>
                <UFormField label="Планировка" :ui="{ label: 'text-xs' }" class="flex-1">
                  <UInput
                    :model-value="
                      apt.roomsCount === 0
                        ? `Студия ${apt.area}м²`
                        : `${apt.roomsCount}к ${apt.area}м²`
                    "
                    disabled
                  />
                </UFormField>
                <UButton
                  v-if="stack.apartments.length > 1"
                  variant="ghost"
                  size="xs"
                  icon="i-tabler-x"
                  color="error"
                  class="self-end mb-1.5"
                  @click="removeApartment(stack, ai)"
                />
              </div>
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
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-(--ui-border)">
          <div class="text-sm text-(--ui-text-muted)">
            Будет создано: <b>{{ totalApartments }}</b> кв.,
            <b>{{ uniqueLayoutsCount }}</b> планировок
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
            </UButton>
          </div>
        </div>
      </div>

      <!-- PREVIEW -->
      <div class="lg:sticky lg:top-4 self-start">
        <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg) shadow-sm">
          <div class="border-b border-(--ui-border) px-4 py-3">
            <h3 class="text-sm font-semibold">Превью шахматки</h3>
            <p class="text-xs text-(--ui-text-muted) mt-0.5">
              Номера квартир: этаж×100 + номер
            </p>
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
                <div
                  v-for="(apt, i) in floor.apartments"
                  :key="i"
                  :title="`№${apt.apartmentNumber} · ${apt.roomsCount}к · ${apt.area} м²`"
                  class="flex flex-col items-center justify-center size-10 rounded border border-green-200 bg-green-50 text-[10px] dark:bg-green-950 dark:border-green-800"
                >
                  <span class="font-medium">{{ apt.apartmentNumber }}</span>
                  <span class="text-(--ui-text-muted)">
                    {{ apt.roomsCount === 0 ? "ст" : `${apt.roomsCount}к` }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="!preview.length" class="text-center text-xs text-(--ui-text-muted) py-4">
              Добавьте хотя бы один стояк
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageContainer>
</template>
