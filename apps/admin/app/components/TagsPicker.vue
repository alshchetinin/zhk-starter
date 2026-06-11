<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const props = defineProps<{
  /** When true, imported tag pills are read-only (can't be removed). */
  lockImported?: boolean;
}>();

const model = defineModel<string[]>({ required: true });

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data: tagsData } = useQuery(
  $orpc.tags.list.queryOptions({ input: { page: 1, pageSize: 100 } }),
);

type Tag = {
  id: string;
  name: string;
  integrationId: string | null;
};

const allTags = computed<Tag[]>(() =>
  (tagsData.value?.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    integrationId: t.integrationId ?? null,
  })),
);

const tagById = computed(() => {
  const m = new Map<string, Tag>();
  for (const t of allTags.value) m.set(t.id, t);
  return m;
});

const selectedTags = computed<Tag[]>(() =>
  model.value
    .map((id) => tagById.value.get(id))
    .filter((t): t is Tag => Boolean(t)),
);

const search = ref("");
const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref({ top: "0px", left: "0px", width: "0px" });

function updateDropdownPosition() {
  if (!containerRef.value) return;
  const r = containerRef.value.getBoundingClientRect();
  dropdownStyle.value = {
    top: `${r.bottom + 4}px`,
    left: `${r.left}px`,
    width: `${r.width}px`,
  };
}

watch(isOpen, (v) => {
  if (v) {
    updateDropdownPosition();
    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);
  } else {
    window.removeEventListener("scroll", updateDropdownPosition, true);
    window.removeEventListener("resize", updateDropdownPosition);
  }
});

onUnmounted(() => {
  window.removeEventListener("scroll", updateDropdownPosition, true);
  window.removeEventListener("resize", updateDropdownPosition);
});

const suggestions = computed<Tag[]>(() => {
  const q = search.value.trim().toLowerCase();
  const selected = new Set(model.value);
  return allTags.value
    .filter((t) => !selected.has(t.id))
    .filter((t) => !q || t.name.toLowerCase().includes(q))
    .slice(0, 20);
});

const exactMatch = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return null;
  return allTags.value.find((t) => t.name.toLowerCase() === q) ?? null;
});

const canCreate = computed(
  () => search.value.trim().length > 0 && !exactMatch.value,
);

function addTag(id: string) {
  if (model.value.includes(id)) return;
  model.value = [...model.value, id];
  search.value = "";
  isOpen.value = false;
}

function removeTag(id: string) {
  const tag = tagById.value.get(id);
  if (props.lockImported && tag?.integrationId) return;
  model.value = model.value.filter((v) => v !== id);
}

const createMutation = useMutation({
  mutationFn: (name: string) => $orpcClient.tags.create({ name }),
  onSuccess: (created) => {
    if (!created) return;
    queryClient.invalidateQueries({ queryKey: $orpc.tags.key() });
    addTag(created.id);
    toast.add({ title: `Тег «${created.name}» создан`, color: "success" });
  },
  onError: (err: Error) => {
    toast.add({
      title: "Не удалось создать",
      description: err.message,
      color: "error",
    });
  },
});

function handleCreate() {
  const name = search.value.trim();
  if (!name) return;
  if (exactMatch.value) {
    addTag(exactMatch.value.id);
    return;
  }
  createMutation.mutate(name);
}

function handleEnter() {
  if (suggestions.value.length > 0) {
    addTag(suggestions.value[0]!.id);
  } else if (canCreate.value) {
    handleCreate();
  }
}

function handleBackspace() {
  if (search.value) return;
  // Remove last removable pill
  for (let i = model.value.length - 1; i >= 0; i--) {
    const tag = tagById.value.get(model.value[i]!);
    if (props.lockImported && tag?.integrationId) continue;
    removeTag(model.value[i]!);
    return;
  }
}

onClickOutside(containerRef, () => {
  isOpen.value = false;
});
</script>

<template>
  <div ref="containerRef" class="relative">
    <div
      class="flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-md border border-(--ui-border) bg-(--ui-bg) min-h-9 focus-within:border-(--ui-primary) transition"
      @click="isOpen = true"
    >
      <span
        v-for="tag in selectedTags"
        :key="tag.id"
        class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-xs font-medium"
        :class="
          tag.integrationId
            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
            : 'bg-(--ui-bg-elevated) text-(--ui-text-highlighted)'
        "
      >
        <UIcon
          v-if="tag.integrationId"
          name="i-solar-cloud-download-linear"
          class="size-3"
          title="Импортный тег"
        />
        {{ tag.name }}
        <button
          v-if="!(lockImported && tag.integrationId)"
          type="button"
          class="ml-0.5 -mr-0.5 size-4 inline-flex items-center justify-center rounded hover:bg-(--ui-bg-accented) transition"
          @click.stop="removeTag(tag.id)"
        >
          <UIcon name="i-solar-close-circle-linear" class="size-3" />
        </button>
      </span>

      <input
        v-model="search"
        type="text"
        :placeholder="
          selectedTags.length ? '' : 'Найти или создать тег…'
        "
        class="flex-1 min-w-32 bg-transparent outline-none text-sm py-0.5"
        @focus="isOpen = true"
        @keydown.enter.prevent="handleEnter"
        @keydown.backspace="handleBackspace"
      />
    </div>

    <Teleport to="body">
    <div
      v-if="isOpen && (suggestions.length || canCreate)"
      class="fixed z-50 max-h-64 overflow-auto rounded-md border border-(--ui-border) bg-(--ui-bg) shadow-lg"
      :style="dropdownStyle"
    >
      <button
        v-for="tag in suggestions"
        :key="tag.id"
        type="button"
        class="w-full text-left px-3 py-2 text-sm hover:bg-(--ui-bg-elevated) transition flex items-center gap-2"
        @click="addTag(tag.id)"
      >
        <UIcon
          v-if="tag.integrationId"
          name="i-solar-cloud-download-linear"
          class="size-3.5 text-(--ui-text-dimmed)"
        />
        <UIcon
          v-else
          name="i-solar-tag-linear"
          class="size-3.5 text-(--ui-text-dimmed)"
        />
        <span>{{ tag.name }}</span>
      </button>

      <button
        v-if="canCreate"
        type="button"
        class="w-full text-left px-3 py-2 text-sm hover:bg-(--ui-bg-elevated) transition flex items-center gap-2 border-t border-(--ui-border)"
        :disabled="createMutation.isPending.value"
        @click="handleCreate"
      >
        <UIcon
          name="i-solar-add-square-linear"
          class="size-3.5 text-(--ui-primary)"
        />
        <span>
          Создать
          <span class="font-medium">«{{ search.trim() }}»</span>
        </span>
      </button>
    </div>
    </Teleport>
  </div>
</template>
