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
    toast.add({
      title: "Сайт создан и скрыт",
      description: "Включите его в настройках сайта, когда будет готов",
      color: "success",
    });
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

const showDuplicate = ref(false);
const dupSource = ref<{ id: string; name: string } | null>(null);
const dupForm = reactive({ name: "", slug: "", cityId: "" });

const { data: citiesData } = useQuery($orpc.cities.list.queryOptions());
const cityItems = computed(() => [
  { label: "Без города", value: "" },
  ...(citiesData.value?.map((c: { id: string; name: string }) => ({ label: c.name, value: c.id })) ?? []),
]);

function openDuplicate(site: { id: string; name: string }) {
  dupSource.value = site;
  dupForm.name = `${site.name} (копия)`;
  dupForm.slug = "";
  dupForm.cityId = "";
  showDuplicate.value = true;
}
watch(() => dupForm.name, (v) => { dupForm.slug = slugify(v); });

const duplicateMutation = useMutation({
  mutationFn: () =>
    $orpcClient.sites.duplicate({
      sourceSiteId: dupSource.value!.id,
      name: dupForm.name,
      slug: dupForm.slug,
      cityId: dupForm.cityId || null,
    }),
  onSuccess: (created: { id: string }) => {
    toast.add({ title: "Сайт продублирован", color: "success" });
    showDuplicate.value = false;
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
    navigateTo(`/sites/${created.id}`);
  },
  onError: () => {
    toast.add({ title: "Не удалось продублировать (проверьте slug)", color: "error" });
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
          icon="i-solar-add-square-linear"
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
      <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
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
              :name="item.isPrimary ? 'i-solar-home-smile-linear' : 'i-solar-global-linear'"
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
              <AppStatusPill
                v-if="!item.isActive"
                tone="neutral"
                label="Скрыт"
                dot
              />
              <AppStatusPill
                v-else-if="item.accessPassword"
                tone="info"
                label="Под паролем"
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
              icon="i-solar-home-smile-linear"
              title="Сделать главным"
              :loading="primaryMutation.isPending.value"
              @click="primaryMutation.mutate(item.id)"
            />
            <UButton
              variant="ghost"
              icon="i-solar-copy-linear"
              title="Дублировать"
              @click="openDuplicate({ id: item.id, name: item.name })"
            />
            <UButton
              :to="`/sites/${item.id}`"
              variant="ghost"
              icon="i-solar-pen-new-square-linear"
              title="Редактировать"
            />
            <UButton
              v-if="!item.isPrimary"
              variant="ghost"
              icon="i-solar-trash-bin-trash-linear"
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
      icon="i-solar-global-linear"
      title="Сайтов пока нет"
      description="Создайте сайт для нового региона."
    >
      <template #actions>
        <UButton
          icon="i-solar-add-square-linear"
          color="primary"
          @click="showCreate = true"
        >
          Новый сайт
        </UButton>
      </template>
    </AppEmptyState>

    <UModal v-model:open="showDuplicate" title="Дублировать сайт">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-(--ui-text-muted)">
            Копируется контент-шаблон (страницы, главная, блоки, модалки, контакты,
            банки/ипотека, новости/акции/документы, SEO). Каталог недвижимости и
            интеграции НЕ копируются — город синкает свой. Новый сайт создаётся
            как черновик (неактивен).
          </p>
          <UFormField label="Название">
            <UInput v-model="dupForm.name" placeholder="Название нового сайта" size="sm" />
          </UFormField>
          <UFormField label="Slug" description="Уникальный путь сайта">
            <UInput v-model="dupForm.slug" placeholder="url-slug" size="sm" />
          </UFormField>
          <UFormField label="Город">
            <USelect v-model="dupForm.cityId" :items="cityItems" placeholder="Без города" size="sm" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end w-full">
          <UButton variant="outline" @click="showDuplicate = false">Отмена</UButton>
          <UButton
            color="primary"
            :loading="duplicateMutation.isPending.value"
            :disabled="!dupForm.name.trim() || !dupForm.slug.trim()"
            @click="duplicateMutation.mutate()"
          >
            Дублировать
          </UButton>
        </div>
      </template>
    </UModal>

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
