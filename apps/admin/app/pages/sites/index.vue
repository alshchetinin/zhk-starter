<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";

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
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Сайты</h1>
        <p class="text-sm text-(--ui-text-muted) mt-1">
          Главный сайт отдаётся на голом домене, остальные — по поддоменам
          <code>{slug}.example.com</code>.
        </p>
      </div>
      <UButton
        icon="i-tabler-plus"
        class="bg-(--ui-bg-inverted) hover:bg-(--ui-bg-inverted)/90 text-(--ui-text-inverted) rounded-xl"
        @click="showCreate = true"
      >
        Новый сайт
      </UButton>
    </div>

    <div v-if="isPending" class="flex items-center gap-2 text-(--ui-text-muted)">
      <UIcon name="i-tabler-loader-2" class="animate-spin" />
      <span>Загрузка...</span>
    </div>

    <div v-else-if="data?.length" class="grid grid-cols-1 gap-4">
      <div
        v-for="item in data"
        :key="item.id"
        class="flex gap-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) p-4"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <NuxtLink :to="`/sites/${item.id}`" class="text-base font-semibold truncate hover:underline">
              {{ item.name }}
            </NuxtLink>
            <UBadge v-if="item.isPrimary" color="primary" variant="subtle" icon="i-tabler-home-star">
              Главный
            </UBadge>
          </div>
          <div class="flex items-center gap-4 text-xs text-(--ui-text-dimmed)">
            <span><code>{{ item.slug }}</code></span>
            <span v-if="item.customDomain">Домен: <code>{{ item.customDomain }}</code></span>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <UButton
            v-if="!item.isPrimary"
            variant="ghost"
            size="xs"
            icon="i-tabler-home-star"
            class="rounded-lg"
            :loading="primaryMutation.isPending.value"
            title="Сделать главным"
            @click="primaryMutation.mutate(item.id)"
          />
          <NuxtLink :to="`/sites/${item.id}`">
            <UButton variant="ghost" size="xs" icon="i-tabler-edit" class="rounded-lg" />
          </NuxtLink>
          <UButton
            v-if="!item.isPrimary"
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

    <UModal v-model:open="showCreate" title="Новый сайт">
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField label="Slug (поддомен)" required>
            <UInput v-model="form.slug" placeholder="msk" />
          </UFormField>
          <UFormField label="Название" required>
            <UInput v-model="form.name" placeholder="Сайт Москва" />
          </UFormField>
          <UFormField label="Свой домен" hint="опционально">
            <UInput v-model="form.customDomain" placeholder="msk-neometria.ru" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton variant="ghost" @click="showCreate = false">Отмена</UButton>
          <UButton
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
