<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const { data, isPending } = useQuery($orpc.sites.list.queryOptions());

const showCreate = ref(false);
const form = ref({ slug: "", name: "", customDomain: "" });

function resetForm() {
  form.value = { slug: "", name: "", customDomain: "" };
}

const createMutation = useMutation({
  mutationFn: () =>
    $orpcClient.sites.create({
      slug: form.value.slug.trim(),
      name: form.value.name.trim(),
      customDomain: form.value.customDomain.trim() || null,
    }),
  onSuccess: () => {
    toast.add({ title: "Сайт создан", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
    resetForm();
    showCreate.value = false;
  },
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.sites.delete({ id }),
  onSuccess: () => {
    toast.add({ title: "Сайт удалён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
  },
});

const primaryMutation = useMutation({
  mutationFn: (id: string) => $orpcClient.sites.makePrimary({ id }),
  onSuccess: () => {
    toast.add({ title: "Главный сайт обновлён", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
  },
});
</script>

<template>
  <PageContainer>
    <AppPageHeader
      title="Сайты"
      subtitle="Главный сайт отдаётся на голом домене, остальные — по поддоменам"
    >
      <template #actions>
        <UButton
          icon="i-tabler-plus"
          color="primary"
          @click="showCreate = true"
        >
          Новый сайт
        </UButton>
      </template>
    </AppPageHeader>

    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-tabler-loader-2" class="animate-spin size-4" />
      Загрузка…
    </div>

    <AppDataCard v-else-if="data?.length" flush>
      <div class="divide-y divide-(--ui-border)">
        <div
          v-for="item in data"
          :key="item.id"
          class="group flex items-center gap-3 px-4 py-3 hover:bg-(--ui-bg-elevated) transition"
        >
          <div
            class="size-10 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0"
          >
            <UIcon
              :name="item.isPrimary ? 'i-tabler-home-star' : 'i-tabler-world'"
              class="size-5 text-(--ui-text-dimmed)"
              :class="item.isPrimary && 'text-amber-500'"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <NuxtLink
                :to="`/sites/${item.id}`"
                class="text-sm font-semibold truncate hover:underline"
              >
                {{ item.name }}
              </NuxtLink>
              <AppStatusPill
                v-if="item.isPrimary"
                tone="warning"
                label="Главный"
                dot
              />
            </div>
            <div
              class="flex items-center gap-3 text-[11px] text-(--ui-text-dimmed) mt-0.5"
            >
              <span class="font-mono">{{ item.slug }}</span>
              <span v-if="item.customDomain" class="font-mono">
                · {{ item.customDomain }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
            <UButton
              v-if="!item.isPrimary"
              variant="ghost"
              icon="i-tabler-home-star"
              title="Сделать главным"
              :loading="primaryMutation.isPending.value"
              @click="primaryMutation.mutate(item.id)"
            />
            <UButton
              :to="`/sites/${item.id}`"
              variant="ghost"
              icon="i-tabler-edit"
              title="Редактировать"
            />
            <UButton
              v-if="!item.isPrimary"
              variant="ghost"
              icon="i-tabler-trash"
              title="Удалить"
              :loading="deleteMutation.isPending.value"
              @click="deleteMutation.mutate(item.id)"
            />
          </div>
        </div>
      </div>
    </AppDataCard>

    <AppEmptyState
      v-else
      icon="i-tabler-world-off"
      title="Сайтов пока нет"
      description="Создайте сайт для нового региона."
    >
      <template #actions>
        <UButton
          icon="i-tabler-plus"
          color="primary"
          @click="showCreate = true"
        >
          Новый сайт
        </UButton>
      </template>
    </AppEmptyState>

    <UModal v-model:open="showCreate" title="Новый сайт">
      <template #body>
        <div class="flex flex-col gap-3">
          <UFormField label="Slug (поддомен)" required>
            <UInput v-model="form.slug" placeholder="msk" size="sm" />
          </UFormField>
          <UFormField label="Название" required>
            <UInput v-model="form.name" placeholder="Сайт Москва" size="sm" />
          </UFormField>
          <UFormField label="Свой домен" hint="опционально">
            <UInput
              v-model="form.customDomain"
              placeholder="msk-example.ru"
              size="sm"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton variant="outline" @click="showCreate = false">
            Отмена
          </UButton>
          <UButton
            color="primary"
            :loading="createMutation.isPending.value"
            :disabled="!form.slug.trim() || !form.name.trim()"
            @click="createMutation.mutate()"
          >
            Создать
          </UButton>
        </div>
      </template>
    </UModal>
  </PageContainer>
</template>
