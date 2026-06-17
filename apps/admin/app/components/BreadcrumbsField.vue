<script setup lang="ts">
import type { BreadcrumbsConfig, BreadcrumbItem } from "@zhk/api/shared/breadcrumbs";

const model = defineModel<BreadcrumbsConfig>({ required: true });

const modeOptions = [
  { label: "Авто", value: "auto" },
  { label: "Своя цепочка", value: "custom" },
  { label: "Скрыть", value: "hidden" },
];

function setMode(mode: BreadcrumbsConfig["mode"]) {
  model.value = { ...model.value, mode };
}

const items = computed<BreadcrumbItem[]>({
  get: () => model.value.items ?? [],
  set: (items) => {
    model.value = { ...model.value, items };
  },
});

function defaultItem(): BreadcrumbItem {
  return { label: "", href: "" };
}
</script>

<template>
  <div class="space-y-3">
    <UFormField
      label="Режим"
      description="Авто — по структуре сайта; Своя цепочка — задаёте звенья руками; Скрыть — крошки не показываются"
    >
      <USelect
        :model-value="model.mode"
        :items="modeOptions"
        @update:model-value="setMode($event as BreadcrumbsConfig['mode'])"
      />
    </UFormField>

    <div v-if="model.mode === 'custom'" class="space-y-2">
      <p class="text-xs text-(--ui-text-dimmed)">
        Звенья после «Главной». Последнее — текущая страница. Ссылку можно оставить пустой.
      </p>
      <RepeaterField v-model="items" :default-item="defaultItem">
        <template #item="{ item, update }">
          <UFormField label="Подпись">
            <UInput
              :model-value="(item as BreadcrumbItem).label"
              placeholder="Каталог"
              size="sm"
              @update:model-value="update('label', $event)"
            />
          </UFormField>
          <UFormField label="Ссылка" description="Необязательно — без ссылки звено будет текстом">
            <UInput
              :model-value="(item as BreadcrumbItem).href"
              placeholder="/catalog"
              size="sm"
              @update:model-value="update('href', $event)"
            />
          </UFormField>
        </template>
      </RepeaterField>
    </div>
  </div>
</template>
