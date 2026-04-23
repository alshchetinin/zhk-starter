<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const props = defineProps<{
  entityType: "pages" | "news" | "documents" | "promotions" | "homepage" | "contacts";
  entityId: string;
  currentSnapshot: unknown;
}>();

const emit = defineEmits<{
  (e: "restore", snapshot: unknown): void;
}>();

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const enabled = computed(() => !!props.entityId);

const { data: versions, isPending } = useQuery(
  computed(() => ({
    ...$orpc.versions.list.queryOptions({
      input: { entityType: props.entityType, entityId: props.entityId },
    }),
    enabled: enabled.value,
  })),
);

const note = ref("");

const snapshotMutation = useMutation({
  mutationFn: () =>
    $orpcClient.versions.create({
      entityType: props.entityType,
      entityId: props.entityId,
      snapshot: props.currentSnapshot,
      note: note.value || null,
    }),
  onSuccess: () => {
    toast.add({ title: "Версия сохранена", color: "success" });
    note.value = "";
    queryClient.invalidateQueries({ queryKey: $orpc.versions.key() });
  },
});

function restore(v: { snapshot: unknown }) {
  emit("restore", v.snapshot);
  toast.add({ title: "Версия применена к форме. Не забудьте сохранить.", color: "info" });
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("ru-RU");
}
</script>

<template>
  <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4">
    <div class="flex items-center justify-between mb-3">
      <h4 class="font-semibold">История версий</h4>
    </div>

    <div class="flex gap-2 mb-3">
      <UInput v-model="note" placeholder="Заметка (опц.)" class="flex-1" size="sm" />
      <UButton
        icon="i-tabler-camera"
        size="sm"
        variant="outline"
        :loading="snapshotMutation.isPending.value"
        :disabled="!entityId"
        @click="snapshotMutation.mutate()"
      >
        Снимок
      </UButton>
    </div>

    <div v-if="isPending" class="text-xs text-(--ui-text-muted)">Загрузка…</div>

    <div v-else-if="!versions?.length" class="text-xs text-(--ui-text-muted) py-4 text-center">
      Версий пока нет. Нажмите «Снимок» чтобы сохранить текущее состояние.
    </div>

    <div v-else class="flex flex-col gap-2 max-h-96 overflow-y-auto">
      <div
        v-for="v in versions"
        :key="v.id"
        class="flex items-start gap-2 border border-(--ui-border) rounded-md p-2 text-xs"
      >
        <UBadge size="xs" variant="subtle">v{{ v.version }}</UBadge>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">{{ v.note || "—" }}</div>
          <div class="text-(--ui-text-dimmed) text-[10px] mt-0.5">
            {{ formatDate(v.createdAt) }}
            <span v-if="v.createdBy"> · {{ v.createdBy.name }}</span>
          </div>
        </div>
        <UButton
          size="xs"
          variant="ghost"
          icon="i-tabler-history-toggle"
          title="Восстановить"
          @click="restore(v)"
        />
      </div>
    </div>
  </div>
</template>
