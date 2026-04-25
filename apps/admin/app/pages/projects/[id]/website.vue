<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const props = defineProps<{
  project: any;
}>();

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.pages.list.queryOptions({
      input: {
        page: 1,
        pageSize: 100,
        projectId: props.project.id,
      },
    }),
  ),
);

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.pages.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Страница удалена", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.pages.key() });
  },
});
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold">Страницы проекта</h3>
      <NuxtLink :to="`/pages/create?projectId=${project.id}`">
        <UButton icon="i-tabler-plus" size="sm" class="rounded-md">
          Создать страницу
        </UButton>
      </NuxtLink>
    </div>

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <div v-else-if="data?.data.length" class="grid grid-cols-1 gap-3">
      <div
        v-for="item in data.data"
        :key="item.id"
        class="flex items-center gap-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 transition-shadow hover:shadow-md"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <NuxtLink
              :to="`/pages/${item.id}`"
              class="text-sm font-semibold truncate hover:underline"
            >
              {{ item.title }}
            </NuxtLink>
            <UBadge
              :color="pageStatusColors[item.status] ?? 'neutral'"
              variant="subtle"
              size="xs"
            >
              {{ pageStatusLabels[item.status] ?? item.status }}
            </UBadge>
          </div>
          <p class="text-xs text-(--ui-text-dimmed) mt-0.5">/{{ item.slug }}</p>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <NuxtLink :to="`/pages/${item.id}`">
            <UButton variant="ghost" size="xs" icon="i-tabler-edit" class="rounded-lg" />
          </NuxtLink>
          <UButton
            variant="ghost"
            size="xs"
            icon="i-tabler-trash"
            color="error"
            class="rounded-lg"
            :loading="deleteMutation.isPending.value"
            @click="deleteMutation.mutate(item.id)"
          />
        </div>
      </div>
    </div>

    <div
      v-else
      class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-12 text-center"
    >
      <UIcon name="i-tabler-file-text-off" class="mx-auto size-12 text-(--ui-text-muted)" />
      <p class="mt-2 text-(--ui-text-muted)">У проекта пока нет страниц</p>
      <NuxtLink :to="`/pages/create?projectId=${project.id}`">
        <UButton class="mt-4" icon="i-tabler-plus" size="sm">
          Создать первую страницу
        </UButton>
      </NuxtLink>
    </div>
  </div>
</template>
