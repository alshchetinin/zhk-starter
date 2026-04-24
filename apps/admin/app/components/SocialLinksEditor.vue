<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const props = defineProps<{
  siteId: string | null;
  title?: string;
  description?: string;
}>();

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data, isPending } = useQuery(
  computed(() => $orpc.socialLinks.list.queryOptions({ input: { siteId: props.siteId } })),
);

const items = ref<Array<{ type: string; link: string }>>([]);

watch(data, (v) => {
  if (v) items.value = v.map((r) => ({ type: r.type, link: r.link }));
}, { immediate: true });

const typeOptions = [
  { label: "VK", value: "vk" },
  { label: "Telegram", value: "telegram" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Одноклассники", value: "ok" },
  { label: "YouTube", value: "youtube" },
  { label: "Дзен", value: "dzen" },
];

const saveMutation = useMutation({
  mutationFn: () =>
    $orpcClient.socialLinks.save({
      siteId: props.siteId,
      items: items.value
        .filter((i) => i.link.trim())
        .map((i, idx) => ({ type: i.type as never, link: i.link.trim(), sortOrder: idx })),
    }),
  onSuccess: () => {
    toast.add({ title: "Сохранено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.socialLinks.key() });
  },
  onError: () => toast.add({ title: "Ошибка сохранения", color: "error" }),
});
</script>

<template>
  <div class="rounded-xl border border-(--ui-border) p-5 space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-(--ui-text-highlighted)">
          {{ title ?? "Соцсети" }}
        </h2>
        <p v-if="description" class="text-sm text-(--ui-text-muted) mt-1">
          {{ description }}
        </p>
      </div>
      <UButton
        :loading="saveMutation.isPending.value"
        icon="i-tabler-device-floppy"
        size="sm"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
        @click="saveMutation.mutate()"
      >
        Сохранить
      </UButton>
    </div>

    <div v-if="isPending" class="text-sm text-(--ui-text-muted)">Загрузка...</div>

    <RepeaterField
      v-else
      v-model="items"
      :default-item="() => ({ type: 'telegram', link: '' })"
      :max="10"
    >
      <template #item="{ item, update }">
        <div class="space-y-3">
          <UFormField label="Соцсеть" required>
            <USelect
              :model-value="item.type"
              :items="typeOptions"
              class="w-full"
              @update:model-value="update('type', $event)"
            />
          </UFormField>
          <UFormField label="Ссылка" required>
            <UInput
              :model-value="item.link"
              placeholder="https://..."
              @update:model-value="update('link', $event)"
            />
          </UFormField>
        </div>
      </template>
    </RepeaterField>
  </div>
</template>
