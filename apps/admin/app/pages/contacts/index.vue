<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const ALL_TAGS = "__all__";
const tagFilter = ref<string>(ALL_TAGS);

const { data, isPending } = useQuery(
  computed(() =>
    $orpc.contacts.list.queryOptions({
      input: tagFilter.value !== ALL_TAGS ? { tag: tagFilter.value } : undefined,
    }),
  ),
);

const allTags = computed(() => {
  const set = new Set<string>();
  for (const c of data.value ?? []) for (const t of c.tags) set.add(t);
  return Array.from(set).sort();
});

function prefetch(id: string) {
  queryClient.prefetchQuery(
    $orpc.contacts.getById.queryOptions({ input: { id } }),
  );
}

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.contacts.delete({ id }),
  onMutate: async (id) => {
    const listKey = $orpc.contacts.list.key();
    await queryClient.cancelQueries({ queryKey: listKey });
    const snapshots = queryClient.getQueriesData({ queryKey: listKey });
    queryClient.setQueriesData({ queryKey: listKey }, (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.filter((c: any) => c.id !== id);
    });
    return { snapshots };
  },
  onError: (_e, _id, ctx) => {
    if (!ctx) return;
    for (const [key, v] of ctx.snapshots) queryClient.setQueryData(key, v);
    toast.add({ title: "Не удалось удалить", color: "error" });
  },
  onSuccess: () => toast.add({ title: "Контакт удалён", color: "success" }),
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: $orpc.contacts.key() });
  },
});
</script>

<template>
  <PageContainer>
    <div class="mb-6 flex items-center justify-between gap-3">
      <h1 class="text-2xl font-bold">Контакты</h1>
      <div class="flex items-center gap-3">
        <USelect
          v-if="allTags.length"
          v-model="tagFilter"
          :items="[{ label: 'Все теги', value: ALL_TAGS }, ...allTags.map((t) => ({ label: t, value: t }))]"
          class="w-48"
        />
        <NuxtLink to="/contacts/new">
          <UButton
            icon="i-tabler-plus"
            class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
          >
            Новый контакт
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <div v-else-if="data?.length" class="grid grid-cols-1 gap-3">
      <div
        v-for="item in data"
        :key="item.id"
        class="flex gap-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4 transition-shadow hover:shadow-md"
        @mouseenter="prefetch(item.id)"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <NuxtLink
              :to="`/contacts/${item.id}`"
              class="text-base font-semibold truncate hover:underline"
            >
              {{ item.label }}
            </NuxtLink>
            <UBadge
              v-for="tag in item.tags"
              :key="tag"
              variant="subtle"
              color="neutral"
            >
              {{ tag }}
            </UBadge>
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--ui-text-dimmed)">
            <span v-if="item.phone"><UIcon name="i-tabler-phone" class="mr-1" />{{ item.phone }}</span>
            <span v-if="item.email"><UIcon name="i-tabler-mail" class="mr-1" />{{ item.email }}</span>
            <span v-if="item.address" class="truncate"><UIcon name="i-tabler-map-pin" class="mr-1" />{{ item.address }}</span>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <NuxtLink :to="`/contacts/${item.id}`">
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

    <div v-else class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-12 text-center">
      <UIcon name="i-tabler-address-book-off" class="mx-auto size-12 text-(--ui-text-muted)" />
      <p class="mt-2 text-(--ui-text-muted)">Контактов пока нет</p>
      <NuxtLink to="/contacts/new">
        <UButton class="mt-4" icon="i-tabler-plus">Создать первый контакт</UButton>
      </NuxtLink>
    </div>
  </PageContainer>
</template>
