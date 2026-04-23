<script setup lang="ts">
const props = defineProps<{ collapsed?: boolean }>();
const { sites, currentSite, setSite } = useCurrentSite();

const items = computed(() => {
  const list = sites.value.map((s) => ({
    label: s.name,
    icon: s.isPrimary ? "i-tabler-home-star" : "i-tabler-building-store",
    checked: s.id === currentSite.value?.id,
    onSelect: () => setSite(s.id),
  }));
  return [
    list,
    [
      {
        label: "Управление сайтами",
        icon: "i-tabler-settings",
        to: "/sites",
      },
    ],
  ];
});
</script>

<template>
  <UDropdownMenu :items="items" :ui="{ content: 'w-64' }">
    <UButton
      color="neutral"
      variant="soft"
      class="w-full h-auto py-2"
      :class="[props.collapsed ? 'justify-center px-0' : 'justify-between px-3']"
    >
      <div class="flex items-center gap-2 min-w-0">
        <UIcon
          :name="currentSite?.isPrimary ? 'i-tabler-home-star' : 'i-tabler-building-store'"
          class="size-4 shrink-0"
        />
        <div v-if="!props.collapsed" class="flex flex-col items-start min-w-0 text-left">
          <span class="text-sm font-medium truncate w-full">{{ currentSite?.name ?? "—" }}</span>
          <span class="text-xs text-(--ui-text-muted) truncate w-full">
            {{ currentSite?.isPrimary ? "Главный" : currentSite?.slug }}
          </span>
        </div>
      </div>
      <UIcon v-if="!props.collapsed" name="i-tabler-selector" class="size-4 text-(--ui-text-muted) shrink-0" />
    </UButton>
  </UDropdownMenu>
</template>
