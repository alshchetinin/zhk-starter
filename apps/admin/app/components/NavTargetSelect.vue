<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import {
  NAV_ROUTES,
  NAV_ROUTE_LABELS,
  type NavTarget,
} from "@zhk/api/shared/navigation";

const model = defineModel<NavTarget>({ required: true });
const { $orpc } = useNuxtApp();

const kindItems = [
  { label: "Страница", value: "page" },
  { label: "Раздел сайта", value: "route" },
  { label: "Категория (авто-подменю)", value: "category" },
  { label: "Внешняя ссылка", value: "url" },
  { label: "Действие (модалка)", value: "action" },
] as const;

const routeItems = NAV_ROUTES.map((r) => ({ label: NAV_ROUTE_LABELS[r], value: r }));

const { data: pagesData, isPending: pagesLoading } = useQuery(
  computed(() => $orpc.pages.list.queryOptions({ input: { page: 1, pageSize: 100 } })),
);
const pageItems = computed(() =>
  (pagesData.value?.data ?? []).map((p) => ({ label: p.title, value: p.id })),
);

const { data: categoriesData, isPending: categoriesLoading } = useQuery(
  computed(() => $orpc.pageCategories.list.queryOptions()),
);
const categoryItems = computed(() =>
  (categoriesData.value ?? []).map((c) => ({ label: c.title, value: c.id })),
);

const { data: modalsData, isPending: modalsLoading } = useQuery(
  computed(() => $orpc.modals.list.queryOptions({ input: { page: 1, pageSize: 100 } })),
);
const modalItems = computed(() =>
  (modalsData.value?.data ?? []).map((m) => ({ label: m.title, value: m.slug })),
);

// Смена типа → сброс на валидный дефолт этого типа.
function setKind(kind: NavTarget["kind"]) {
  switch (kind) {
    case "page": model.value = { kind: "page", pageId: "" }; break;
    case "route": model.value = { kind: "route", route: "/" }; break;
    case "category": model.value = { kind: "category", categoryId: "" }; break;
    case "url": model.value = { kind: "url", href: "", external: false }; break;
    case "action": model.value = { kind: "action", modal: "" }; break;
  }
}

// Узкие сеттеры (model — дискриминированный union, мутируем через пересоздание).
function patch(part: Partial<NavTarget>) {
  model.value = { ...model.value, ...part } as NavTarget;
}
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    <USelect
      :model-value="model.kind"
      :items="kindItems"
      value-key="value"
      size="sm"
      class="sm:w-48"
      @update:model-value="setKind($event)"
    />

    <USelect
      v-if="model.kind === 'page'"
      :model-value="model.pageId"
      :items="pageItems"
      :loading="pagesLoading"
      value-key="value"
      placeholder="Выберите страницу"
      size="sm"
      class="flex-1"
      @update:model-value="patch({ pageId: $event })"
    />

    <USelect
      v-else-if="model.kind === 'route'"
      :model-value="model.route"
      :items="routeItems"
      value-key="value"
      size="sm"
      class="flex-1"
      @update:model-value="patch({ route: $event })"
    />

    <USelect
      v-else-if="model.kind === 'category'"
      :model-value="model.categoryId"
      :items="categoryItems"
      :loading="categoriesLoading"
      value-key="value"
      placeholder="Выберите категорию"
      size="sm"
      class="flex-1"
      @update:model-value="patch({ categoryId: $event })"
    />

    <div v-else-if="model.kind === 'url'" class="flex flex-1 items-center gap-2">
      <UInput
        :model-value="model.href"
        placeholder="https://…"
        size="sm"
        class="flex-1"
        @update:model-value="patch({ href: $event })"
      />
      <UCheckbox
        :model-value="model.external ?? false"
        label="В новой вкладке"
        @update:model-value="patch({ external: $event === true })"
      />
    </div>

    <USelect
      v-else-if="model.kind === 'action'"
      :model-value="model.modal"
      :items="modalItems"
      :loading="modalsLoading"
      value-key="value"
      placeholder="Выберите модалку"
      size="sm"
      class="flex-1"
      @update:model-value="patch({ modal: $event })"
    />
  </div>
</template>
