<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  defaultSiteNavigation,
  type NavItem,
  type FooterColumn,
  type SiteNavigation,
} from "@zhk/api/shared/navigation";

const route = useRoute();
const { $orpc, $orpcClient } = useNuxtApp();
const toast = useToast();
const queryClient = useQueryClient();

const id = computed(() => route.params.id as string);

const { data, isPending } = useQuery(
  computed(() => $orpc.sites.getById.queryOptions({ input: { id: id.value } })),
);

useHead({
  title: computed(() => (data.value ? `Навигация — ${data.value.name}` : "Навигация")),
});

const header = ref<NavItem[]>([]);
const footer = ref<FooterColumn[]>([]);

const loadedFor = ref<string | null>(null);
watchEffect(() => {
  if (data.value && data.value.id === id.value && loadedFor.value !== id.value) {
    const nav = data.value.settings?.navigation ?? defaultSiteNavigation;
    header.value = structuredClone(toRaw(nav.header));
    footer.value = structuredClone(toRaw(nav.footer));
    loadedFor.value = id.value;
  }
});

function newNavItem(): NavItem {
  return { id: crypto.randomUUID(), label: "", target: { kind: "route", route: "/" } };
}
function newColumn(): FooterColumn {
  return { id: crypto.randomUUID(), title: "", items: [] };
}

const updateMutation = useMutation({
  mutationFn: () => {
    const navigation: SiteNavigation = {
      header: header.value,
      footer: footer.value,
    };
    return $orpcClient.sites.update({ id: id.value, settings: { navigation } });
  },
  onSuccess: () => {
    toast.add({ title: "Сохранено", color: "success" });
    queryClient.invalidateQueries({ queryKey: $orpc.sites.key() });
  },
  onError: () => toast.add({ title: "Ошибка сохранения", color: "error" }),
});
</script>

<template>
  <PageContainer>
    <div
      v-if="isPending"
      class="flex items-center gap-2 text-xs text-(--ui-text-dimmed) py-12 justify-center"
    >
      <UIcon name="i-solar-refresh-linear" class="animate-spin size-4" />
      Загрузка…
    </div>

    <template v-else-if="data">
      <AppPageHeader
        title="Навигация"
        :back="`/sites/${id}/settings`"
        :crumbs="[
          { label: 'Сайты', to: '/sites' },
          { label: data.name ?? 'Сайт', to: `/sites/${id}/settings` },
          { label: 'Навигация' },
        ]"
      />

      <div class="max-w-3xl space-y-3">
        <AppDataCard title="Меню хедера" description="Пункты верхнего меню. У пункта-категории подменю собирается автоматически из её страниц.">
          <RepeaterField
            v-model="header"
            :default-item="newNavItem"
          >
            <template #item="{ item, update }">
              <div class="space-y-3">
                <UFormField label="Подпись" hint="пусто — возьмётся из страницы/раздела">
                  <UInput
                    :model-value="item.label"
                    placeholder="Напр. О компании"
                    size="sm"
                    @update:model-value="update('label', $event)"
                  />
                </UFormField>
                <UFormField label="Куда ведёт">
                  <NavTargetSelect
                    :model-value="item.target"
                    @update:model-value="update('target', $event)"
                  />
                </UFormField>
                <UFormField label="Подпункты (выпадашка)">
                  <RepeaterField
                    :model-value="item.children ?? []"
                    :default-item="newNavItem"
                    @update:model-value="update('children', $event)"
                  >
                    <template #item="{ item: child, update: updateChild }">
                      <div class="space-y-2">
                        <UInput
                          :model-value="child.label"
                          placeholder="Подпись подпункта"
                          size="sm"
                          @update:model-value="updateChild('label', $event)"
                        />
                        <NavTargetSelect
                          :model-value="child.target"
                          @update:model-value="updateChild('target', $event)"
                        />
                      </div>
                    </template>
                  </RepeaterField>
                </UFormField>
              </div>
            </template>
          </RepeaterField>
        </AppDataCard>

        <AppDataCard title="Колонки футера" description="Каждая колонка — заголовок и список ссылок. Число колонок = число записей здесь.">
          <RepeaterField
            v-model="footer"
            :default-item="newColumn"
          >
            <template #item="{ item: col, update: updateCol }">
              <div class="space-y-3">
                <UFormField label="Заголовок колонки" hint="пусто — без заголовка">
                  <UInput
                    :model-value="col.title"
                    placeholder="Напр. Навигация"
                    size="sm"
                    @update:model-value="updateCol('title', $event)"
                  />
                </UFormField>
                <UFormField label="Ссылки">
                  <RepeaterField
                    :model-value="col.items"
                    :default-item="newNavItem"
                    @update:model-value="updateCol('items', $event)"
                  >
                    <template #item="{ item, update }">
                      <div class="space-y-2">
                        <UInput
                          :model-value="item.label"
                          placeholder="Подпись"
                          size="sm"
                          @update:model-value="update('label', $event)"
                        />
                        <NavTargetSelect
                          :model-value="item.target"
                          @update:model-value="update('target', $event)"
                        />
                      </div>
                    </template>
                  </RepeaterField>
                </UFormField>
              </div>
            </template>
          </RepeaterField>
        </AppDataCard>

        <div class="flex items-center gap-2 pt-1">
          <UButton
            color="primary"
            icon="i-solar-diskette-linear"
            :loading="updateMutation.isPending.value"
            @click="updateMutation.mutate()"
          >
            Сохранить
          </UButton>
        </div>
      </div>
    </template>
  </PageContainer>
</template>
