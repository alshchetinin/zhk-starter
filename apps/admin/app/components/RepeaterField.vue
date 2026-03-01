<script setup lang="ts" generic="T extends Record<string, unknown>">
const model = defineModel<T[]>({ default: () => [] });

const props = withDefaults(
  defineProps<{
    defaultItem: () => T;
    min?: number;
    max?: number;
  }>(),
  { min: 0 },
);

const openItems = ref<Set<number>>(new Set());

const canAdd = computed(
  () => props.max === undefined || model.value.length < props.max,
);

const canRemove = computed(() => model.value.length > props.min);

function addItem() {
  if (!canAdd.value) return;
  const newIndex = model.value.length;
  model.value = [...model.value, props.defaultItem()];
  openItems.value = new Set([...openItems.value, newIndex]);
}

function removeItem(index: number) {
  if (!canRemove.value) return;
  model.value = model.value.filter((_, i) => i !== index);
  // Re-index open items
  const next = new Set<number>();
  for (const idx of openItems.value) {
    if (idx < index) next.add(idx);
    else if (idx > index) next.add(idx - 1);
  }
  openItems.value = next;
}

function moveItem(from: number, direction: -1 | 1) {
  const to = from + direction;
  if (to < 0 || to >= model.value.length) return;
  const arr = [...model.value];
  [arr[from]!, arr[to]!] = [arr[to]!, arr[from]!];
  model.value = arr;
  // Swap open state
  const next = new Set<number>();
  for (const idx of openItems.value) {
    if (idx === from) next.add(to);
    else if (idx === to) next.add(from);
    else next.add(idx);
  }
  openItems.value = next;
}

function toggleItem(index: number) {
  const next = new Set(openItems.value);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  openItems.value = next;
}

function updateItem(index: number, key: string, value: unknown) {
  const arr = [...model.value];
  arr[index] = { ...arr[index]!, [key]: value };
  model.value = arr;
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(item, i) in model"
      :key="i"
      class="rounded-lg border border-(--ui-border) bg-(--ui-bg)"
    >
      <div
        class="flex items-center gap-2 px-3 py-1.5 bg-(--ui-bg-elevated) rounded-t-lg cursor-pointer select-none"
        :class="{ 'rounded-b-lg': !openItems.has(i) }"
        @click="toggleItem(i)"
      >
        <UIcon
          name="i-tabler-chevron-right"
          class="size-4 text-(--ui-text-muted) transition-transform duration-200"
          :class="{ 'rotate-90': openItems.has(i) }"
        />
        <span class="text-xs font-medium text-(--ui-text-muted) flex-1">
          #{{ i + 1 }}
        </span>
        <UButton
          variant="ghost"
          size="xs"
          icon="i-tabler-arrow-up"
          :disabled="i === 0"
          @click.stop="moveItem(i, -1)"
        />
        <UButton
          variant="ghost"
          size="xs"
          icon="i-tabler-arrow-down"
          :disabled="i === model.length - 1"
          @click.stop="moveItem(i, 1)"
        />
        <UButton
          variant="ghost"
          size="xs"
          icon="i-tabler-trash"
          color="error"
          :disabled="!canRemove"
          @click.stop="removeItem(i)"
        />
      </div>
      <div v-show="openItems.has(i)" class="space-y-3 p-3 border-t border-(--ui-border)">
        <slot
          name="item"
          :item="item"
          :index="i"
          :update="(key: string, value: unknown) => updateItem(i, key, value)"
        />
      </div>
    </div>

    <UButton
      v-if="canAdd"
      icon="i-tabler-plus"
      variant="outline"
      size="sm"
      @click="addItem"
    >
      Добавить
    </UButton>

    <p
      v-if="max !== undefined || min > 0"
      class="text-xs text-(--ui-text-dimmed)"
    >
      <template v-if="min > 0">Минимум: {{ min }}</template>
      <template v-if="min > 0 && max !== undefined"> · </template>
      <template v-if="max !== undefined">Максимум: {{ max }}</template>
    </p>
  </div>
</template>
