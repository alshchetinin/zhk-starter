<script setup lang="ts">
import type { InfraCategory, InfraPin } from "@zhk/db/schema";
import { useMutation, useQueryClient } from "@tanstack/vue-query";

const props = defineProps<{ project: any }>();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const DEFAULT_CATEGORIES: Omit<InfraCategory, "id">[] = [
  { name: "Школы", icon: "lucide:school", color: "#3b82f6", sortOrder: 0 },
  { name: "Детские сады", icon: "lucide:baby", color: "#8b5cf6", sortOrder: 1 },
  { name: "Медицина", icon: "lucide:heart-pulse", color: "#ef4444", sortOrder: 2 },
  { name: "Спорт", icon: "lucide:dumbbell", color: "#f97316", sortOrder: 3 },
  { name: "Магазины", icon: "lucide:shopping-bag", color: "#10b981", sortOrder: 4 },
  { name: "Кафе", icon: "lucide:coffee", color: "#a16207", sortOrder: 5 },
  { name: "Отдых", icon: "lucide:trees", color: "#059669", sortOrder: 6 },
  { name: "Транспорт", icon: "lucide:bus", color: "#6366f1", sortOrder: 7 },
];

const categories = ref<InfraCategory[]>([]);
const pins = ref<InfraPin[]>([]);
const selectedPinId = ref<string | null>(null);

function initFromProject() {
  categories.value = props.project.infrastructureCategories?.length > 0
    ? [...props.project.infrastructureCategories] as InfraCategory[]
    : DEFAULT_CATEGORIES.map((c) => ({ ...c, id: crypto.randomUUID() }));
  pins.value = [...(props.project.infrastructurePins ?? [])] as InfraPin[];
  selectedPinId.value = null;
}

initFromProject();
watch(() => props.project.id, initFromProject);
const categoryFilter = ref("_all");

const filteredPins = computed(() =>
  categoryFilter.value === "_all"
    ? pins.value
    : pins.value.filter((p) => p.categoryId === categoryFilter.value),
);

const categoryOptions = computed(() => [
  { label: "Все категории", value: "_all" },
  ...categories.value.map((c) => ({ label: c.name, value: c.id })),
]);

const showCategories = ref(false);

// Pin CRUD
function addPin(coordinates: string) {
  const defaultCat = categories.value[0];
  if (!defaultCat) {
    toast.add({ title: "Сначала добавьте категорию", color: "warning" });
    return;
  }
  const pin: InfraPin = {
    id: crypto.randomUUID(),
    title: "",
    coordinates,
    categoryId: defaultCat.id,
  };
  pins.value = [...pins.value, pin];
  selectedPinId.value = pin.id;
}

function updatePin(id: string, key: keyof InfraPin, value: string) {
  pins.value = pins.value.map((p) =>
    p.id === id ? { ...p, [key]: value } : p,
  );
}

function removePin(id: string) {
  pins.value = pins.value.filter((p) => p.id !== id);
  if (selectedPinId.value === id) selectedPinId.value = null;
}

// Category CRUD
function addCategory() {
  const cat: InfraCategory = {
    id: crypto.randomUUID(),
    name: "",
    icon: "lucide:map-pin",
    color: "#6b7280",
    sortOrder: categories.value.length,
  };
  categories.value = [...categories.value, cat];
}

function updateCategory(id: string, key: keyof InfraCategory, value: string | number) {
  categories.value = categories.value.map((c) =>
    c.id === id ? { ...c, [key]: value } : c,
  );
}

function removeCategory(id: string) {
  categories.value = categories.value.filter((c) => c.id !== id);
  // Remove pins with this category
  pins.value = pins.value.filter((p) => p.categoryId !== id);
}

// Save
const saveMutation = useMutation({
  mutationFn: () =>
    $orpcClient.projects.update({
      id: props.project.id,
      infrastructureCategories: categories.value,
      infrastructurePins: pins.value,
    }),
  onSuccess: () => {
    toast.add({ title: "Инфраструктура сохранена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.projects.key() });
  },
});
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton
          variant="outline"
          :icon="showCategories ? 'i-tabler-category' : 'i-tabler-category'"
          class="rounded-md"
          @click="showCategories = !showCategories"
        >
          Категории ({{ categories.length }})
        </UButton>
        <UBadge variant="subtle" color="neutral">
          {{ pins.length }} объектов
        </UBadge>
      </div>
      <UButton
        :loading="saveMutation.isPending.value"
        icon="i-tabler-device-floppy"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted)"
        @click="saveMutation.mutate()"
      >
        Сохранить
      </UButton>
    </div>

    <!-- Categories editor (collapsible) -->
    <div
      v-if="showCategories"
      class="mb-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 space-y-3"
    >
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-(--ui-text-highlighted)">Категории</h3>
        <UButton icon="i-tabler-plus" size="xs" variant="outline" @click="addCategory">
          Добавить
        </UButton>
      </div>
      <div class="space-y-2">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="flex items-center gap-2 rounded-md border border-(--ui-border) p-2"
        >
          <div
            class="h-6 w-6 rounded-full flex-shrink-0"
            :style="{ backgroundColor: cat.color }"
          />
          <UInput
            :model-value="cat.name"
            placeholder="Название"
            size="sm"
            class="flex-1"
            @update:model-value="updateCategory(cat.id, 'name', $event)"
          />
          <UInput
            :model-value="cat.icon"
            placeholder="lucide:icon"
            size="sm"
            class="w-36"
            @update:model-value="updateCategory(cat.id, 'icon', $event)"
          />
          <UInput
            :model-value="cat.color"
            type="color"
            size="sm"
            class="w-12 p-0"
            @update:model-value="updateCategory(cat.id, 'color', $event)"
          />
          <UButton
            variant="ghost"
            icon="i-tabler-trash"
            size="xs"
            color="error"
            @click="removeCategory(cat.id)"
          />
        </div>
      </div>
    </div>

    <!-- Main layout: pins list + map -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <!-- Left: pins list -->
      <div class="space-y-3">
        <USelect v-model="categoryFilter" :items="categoryOptions" size="sm" />

        <div class="space-y-1 max-h-[600px] overflow-y-auto">
          <div
            v-for="pin in filteredPins"
            :key="pin.id"
            class="rounded-md border p-3 cursor-pointer transition-colors"
            :class="
              selectedPinId === pin.id
                ? 'border-(--ui-primary) bg-(--ui-primary)/5'
                : 'border-(--ui-border) hover:bg-(--ui-bg-elevated)'
            "
            @click="selectedPinId = pin.id"
          >
            <div class="space-y-2">
              <UInput
                :model-value="pin.title"
                placeholder="Название объекта"
                size="sm"
                @update:model-value="updatePin(pin.id, 'title', $event)"
                @click.stop
              />
              <div class="flex items-center gap-2">
                <USelect
                  :model-value="pin.categoryId"
                  :items="categories.map((c) => ({ label: c.name, value: c.id }))"
                  size="xs"
                  class="flex-1"
                  @update:model-value="updatePin(pin.id, 'categoryId', $event)"
                  @click.stop
                />
                <UButton
                  variant="ghost"
                  icon="i-tabler-trash"
                  size="xs"
                  color="error"
                  @click.stop="removePin(pin.id)"
                />
              </div>
              <UInput
                :model-value="pin.coordinates"
                placeholder="55.7558, 37.6173"
                size="xs"
                class="font-mono text-xs"
                @update:model-value="updatePin(pin.id, 'coordinates', $event)"
                @click.stop
              />
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-if="filteredPins.length === 0"
            class="py-8 text-center text-(--ui-text-dimmed) text-sm"
          >
            Кликните по карте, чтобы добавить объект
          </div>
        </div>
      </div>

      <!-- Right: map -->
      <div class="lg:col-span-2">
        <InfrastructureMapEditor
          :pins="pins"
          :categories="categories"
          :center="project.coordinates ?? ''"
          @add-pin="addPin"
          @select-pin="selectedPinId = $event"
        />
      </div>
    </div>
  </div>
</template>
