<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const props = withDefaults(
  defineProps<{
    open: boolean;
    multiple?: boolean;
  }>(),
  { multiple: false },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  select: [url: string];
  selectMultiple: [urls: string[]];
}>();

const selectedUrls = ref<Set<string>>(new Set());

const { $orpc } = useNuxtApp();

const page = ref(1);
const pageSize = 24;
const search = ref("");
const debouncedSearch = refDebounced(search, 300);

watch(debouncedSearch, () => {
  page.value = 1;
});

watch(
  () => props.open,
  (val) => {
    if (val) {
      page.value = 1;
      search.value = "";
      selectedUrls.value = new Set();
    }
  },
);

const { data, isPending } = useQuery(
  computed(() => ({
    ...$orpc.media.list.queryOptions({
      input: {
        page: page.value,
        pageSize,
        search: debouncedSearch.value || undefined,
        contentType: "image" as const,
      },
    }),
    enabled: props.open,
  })),
);

const items = computed(() => data.value?.data ?? []);
const total = computed(() => data.value?.total ?? 0);

function toggleSelection(url: string) {
  const next = new Set(selectedUrls.value);
  if (next.has(url)) next.delete(url);
  else next.add(url);
  selectedUrls.value = next;
}

function selectImage(url: string) {
  if (props.multiple) {
    toggleSelection(url);
    return;
  }
  emit("select", url);
  emit("update:open", false);
}

function confirmMultiple() {
  emit("selectMultiple", [...selectedUrls.value]);
  emit("update:open", false);
}
</script>

<template>
  <UModal
    :open="open"
    title="Медиабиблиотека"
    :ui="{ width: 'sm:max-w-4xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="mb-4">
        <UInput
          v-model="search"
          placeholder="Поиск по имени файла..."
          icon="i-solar-magnifer-linear"
          class="w-full"
        />
      </div>

      <div v-if="isPending" class="flex justify-center py-12">
        <UIcon name="i-solar-refresh-linear" class="animate-spin text-2xl" />
      </div>

      <div
        v-else-if="items.length === 0"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-solar-gallery-remove-linear" class="text-4xl text-(--ui-text-dimmed) mb-3" />
        <p class="text-(--ui-text-muted)">Файлов не найдено</p>
      </div>

      <div
        v-else
        class="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto"
      >
        <button
          v-for="item in items"
          :key="item.id"
          class="group relative aspect-square overflow-hidden rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-(--ui-primary)"
          :class="selectedUrls.has(item.url)
            ? 'border-(--ui-primary) ring-2 ring-(--ui-primary)/30'
            : 'border-(--ui-border) hover:border-(--ui-primary) hover:ring-2 hover:ring-(--ui-primary)/30'"
          @click="selectImage(item.url)"
        >
          <img
            :src="item.url"
            :alt="item.fileName ?? ''"
            class="h-full w-full object-cover"
          />
          <div
            v-if="multiple"
            class="absolute right-2 top-2 size-5 rounded border-2 flex items-center justify-center transition-colors"
            :class="selectedUrls.has(item.url)
              ? 'bg-(--ui-primary) border-(--ui-primary)'
              : 'bg-white/80 border-(--ui-border) opacity-0 group-hover:opacity-100'"
          >
            <UIcon
              v-if="selectedUrls.has(item.url)"
              name="i-solar-check-circle-linear"
              class="size-3 text-white"
            />
          </div>
          <div class="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100">
            <p class="text-xs text-white truncate">{{ item.fileName ?? "Без имени" }}</p>
          </div>
        </button>
      </div>

      <div v-if="total > pageSize" class="mt-4 flex justify-center">
        <UPagination
          v-model:page="page"
          :total="total"
          :items-per-page="pageSize"
        />
      </div>

      <div v-if="total > 0" class="mt-3 text-center">
        <span class="text-xs text-(--ui-text-dimmed)">{{ total }} файлов</span>
      </div>
    </template>

    <template v-if="multiple" #footer>
      <div class="flex items-center justify-between w-full">
        <span class="text-sm text-(--ui-text-muted)">
          Выбрано: {{ selectedUrls.size }}
        </span>
        <UButton
          :disabled="selectedUrls.size === 0"
          @click="confirmMultiple"
        >
          Добавить {{ selectedUrls.size }} фото
        </UButton>
      </div>
    </template>
  </UModal>
</template>
